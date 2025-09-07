from __future__ import annotations
import io, os, base64, logging, json
import fitz
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
import pytesseract
from openai import OpenAI
from dotenv import load_dotenv

from backend.rag_store import SimpleRAG
from backend.prompts import SYSTEM_NOTE_TAKING, USER_NOTE_TAKING

# ---------------------------------------------------------
# Init App + CORS
# ---------------------------------------------------------
app = FastAPI(title="Pic-to-Notes (A4F)")

# Custom CORS middleware
@app.middleware("http")
async def cors_handler(request: Request, call_next):
    response = await call_next(request)
    
    # Add CORS headers to every response
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

# Handle OPTIONS requests explicitly
@app.options("/{full_path:path}")
async def options_handler(request: Request):
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

# ---------------------------------------------------------
# Logger
# ---------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pic-to-notes")

# ---------------------------------------------------------
# Env + Clients
# ---------------------------------------------------------
load_dotenv()
A4F_BASE = os.getenv("A4F_BASE_URL", "https://api.a4f.co/v1")
A4F_KEY = os.getenv("A4F_API_KEY", "")
VISION_MODEL = os.getenv("A4F_VISION_MODEL", "provider-6/gpt-4o")
CHAT_MODEL = os.getenv("A4F_CHAT_MODEL", "provider-3/gpt-4")
USE_LOCAL_OCR = os.getenv("USE_LOCAL_OCR", "1") == "1"

client = OpenAI(api_key=A4F_KEY, base_url=A4F_BASE)
rag = SimpleRAG(db_path=os.getenv("RAG_DB", "rag_db.json"))

# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class NotesResponse(BaseModel):
    notes_md: str
    used_kb: List[str]
    strategy: str

class ChatRequest(BaseModel):
    message: str
    context: str = ""

class ChatResponse(BaseModel):
    reply: str

class MCQRequest(BaseModel):
    notes: str
    num_mcqs: int = 5

class MCQResponse(BaseModel):
    mcqs: List[dict]

# ---------------------------------------------------------
# Endpoints
# ---------------------------------------------------------

@app.post("/notes-from-image", response_model=NotesResponse)
async def notes_from_image(image: UploadFile = File(...)):
    if not image:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if image.content_type not in {"image/png", "image/jpeg", "image/jpg", "application/pdf"}:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    try:
        extracted_text = ""
        strategy = ""
        raw_bytes = await image.read()
    except Exception as e:
        logger.error(f"Error reading uploaded image: {e}")
        raise HTTPException(status_code=500, detail="Failed to read uploaded image")

# --- If PDF, extract with PyMuPDF ---
if image.content_type == "application/pdf":
        try:
         with fitz.open(stream=raw_bytes, filetype="pdf") as doc:
                pages = [page.get_text("text") for page in doc]
            extracted_text = "\n".join(pages).strip()
                strategy = "pdf_text+pymupdf"
        except Exception as e:
                extracted_text = f"[PDF extract error: {e}]\n"
                strategy = "pdf_extract_failed"

                # --- Local OCR (images only) ---
        if not extracted_text.strip() and image.content_type != "application/pdf":
            if USE_LOCAL_OCR:
                try:
                    pil_img = Image.open(io.BytesIO(raw_bytes))
                    extracted_text = pytesseract.image_to_string(pil_img)
                    strategy = (strategy + "+local_ocr") if strategy else "local_ocr"
                except Exception as e:
                    logger.warning(f"Local OCR failed: {e}")
                    strategy = (strategy + "+local_ocr_failed") if strategy else "local_ocr_failed"

            # --- Vision API OCR fallback ---
            if not extracted_text.strip():
                try:
                    b64_image = base64.b64encode(raw_bytes).decode("utf-8")
                    vision_resp = client.chat.completions.create(
                        model=VISION_MODEL,
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {"type": "input_text", "text": "Extract all readable text from this image for study notes:"},
                                    {"type": "input_image", "image_data": b64_image}
                                ],
                            }
                        ],
                    )
                    extracted_text = vision_resp.choices[0].message.content or ""
                    strategy = (strategy + "+vision_ocr") if strategy else "vision_ocr"
                except Exception as e:
                    logger.error(f"Vision OCR failed: {e}")
                    extracted_text = f"[Vision OCR error: {e}]\n"
                    strategy = (strategy + "+vision_ocr_failed") if strategy else "vision_ocr_failed"
, detail="Could not extract any text from the file")

        # --- RAG + Notes generation ---
        kb = []
        try:
            kb = rag.topk_text(q=extracted_text or "9th class BISE GRW", k=5) or []
            if isinstance(kb, str):   # sometimes it returns a string
                kb = [kb]
        except Exception as e:
            logger.warning(f"RAG lookup failed: {e}")
            kb = []

        try:
            completion = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_NOTE_TAKING},
                    {"role": "user", "content": USER_NOTE_TAKING.format(content=extracted_text[:16000], kb_chunks=kb[:16000])},
                ],
                temperature=0.2,
            )
            raw_output = completion.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"AI service unavailable: {e}")
            # Fallback: return basic structured format with the extracted text
            fallback_notes = {
                "notes": [extracted_text],
                "mcqs": [],
                "shortQuestions": [],
                "error": "AI service temporarily unavailable. Showing extracted text only."
            }
            return NotesResponse(
                notes_md=json.dumps(fallback_notes, ensure_ascii=False, indent=2),
                used_kb=kb,
                strategy=strategy + "+ai_fallback",
            )

        try:
            parsed = json.loads(raw_output)
        except Exception as e:
            logger.warning(f"Could not parse model output as JSON: {e}")
            parsed = {}

        if isinstance(parsed, dict):
            if "short_questions" in parsed:
                parsed["shortQuestions"] = parsed.pop("short_questions")
            if "ShortQuestions" in parsed:
                parsed["shortQuestions"] = parsed.pop("ShortQuestions")
            if "Shortquestions" in parsed:
                parsed["shortQuestions"] = parsed.pop("Shortquestions")

            parsed.setdefault("notes", [])
            parsed.setdefault("mcqs", [])
            parsed.setdefault("shortQuestions", [])
        else:
            parsed = {"notes": [], "mcqs": [], "shortQuestions": []}

        return NotesResponse(
            notes_md=json.dumps(parsed, ensure_ascii=False, indent=2),
            used_kb=kb,
            strategy=strategy,
        )

    except Exception as e:
        logger.error(f"notes_from_image failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/chat", response_model=ChatResponse)
async def chat_with_notes(req: ChatRequest):
    try:
        kb = []
        try:
            kb = rag.topk_text(q=req.message, k=3) or []
        except Exception as e:
            logger.warning(f"RAG lookup failed in chat: {e}")
            kb = []
        
        # Study-focused system prompt
        system_prompt = """You are a dedicated study assistant. You ONLY answer questions related to:
        - The provided notes and study material
        - Academic subjects and educational topics
        - Study techniques and learning strategies
        - Clarifications about concepts in the notes
        
        If asked about anything unrelated to studies (like entertainment, personal topics, general chat, etc.), 
        politely redirect the conversation back to studying with a response like:
        "I'm here to help you with your studies. Let's focus on your learning material. What would you like to know about your notes?"
        
        Be helpful, clear, and concise in your explanations."""
        
        try:
            completion = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"User question: {req.message}\n\nNOTES CONTEXT:\n{req.context}\n\nKB:\n{kb}"}
                ],
                temperature=0.3,
            )
            reply = completion.choices[0].message.content or "I couldn't generate a response."
            return ChatResponse(reply=reply)
        except Exception as e:
            logger.error(f"AI service unavailable in chat: {e}")
            # Fallback response when AI is down
            fallback_reply = (
                "I'm sorry, but the AI service is temporarily unavailable. "
                "However, I can see your question is about: " + req.message + ". "
                "Please try again in a few moments when the service is restored."
            )
            if req.context.strip():
                fallback_reply += f"\n\nIn the meantime, here's the context from your notes:\n{req.context[:500]}..."
            return ChatResponse(reply=fallback_reply)
    except Exception as e:
        logger.error(f"chat_with_notes failed: {e}")
        return ChatResponse(reply="I'm sorry, there was an error processing your request. Please try again.")


@app.get("/health")
async def health():
    return {"ok": True}

@app.get("/test-cors")
async def test_cors():
    return {"message": "CORS is working", "timestamp": "2025-01-01"}