from __future__ import annotations
import io, os, base64, logging, json
import fitz
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import pytesseract
from openai import OpenAI
from dotenv import load_dotenv

from rag_store import SimpleRAG
from prompts import SYSTEM_NOTE_TAKING, USER_NOTE_TAKING

# ---------------------------------------------------------
# Init App + CORS
# ---------------------------------------------------------
app = FastAPI(title="Pic-to-Notes (A4F)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
CHAT_MODEL = os.getenv("A4F_CHAT_MODEL", "provider-6/gpt-4o")
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

        # --- Local OCR (for images only) ---
        if not extracted_text.strip() and USE_LOCAL_OCR and image.content_type != "application/pdf":
            try:
                pil_img = Image.open(io.BytesIO(raw_bytes))
                extracted_text = pytesseract.image_to_string(pil_img)
                strategy = (strategy + "+local_ocr") if strategy else "local_ocr"
            except Exception as e:
                extracted_text = f"[OCR error: {e}]\n"
                strategy = (strategy + "+local_ocr_failed") if strategy else "local_ocr_failed"

        # --- Vision API fallback ---
        if not extracted_text.strip():
            b64 = base64.b64encode(raw_bytes).decode("utf-8")
            data_url = f"data:{image.content_type or 'image/png'};base64,{b64}"
            resp = client.chat.completions.create(
                model=VISION_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all visible text verbatim from this image. Keep line breaks."},
                            {"type": "image_url", "image_url": {"url": data_url}},
                        ],
                    }
                ],
                temperature=0,
            )
            extracted_text = (resp.choices[0].message.content or "").strip()
            strategy = (strategy + "+vision_a4f") if strategy else "vision_a4f"

        if not extracted_text.strip():
            raise HTTPException(status_code=422, detail="Could not extract any text from the file")

        # --- RAG + Notes generation ---
        kb = rag.topk_text(q=extracted_text or "9th class BISE GRW", k=5) or []
        if isinstance(kb, str):   # sometimes it returns a string
            kb = [kb]

        completion = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_NOTE_TAKING},
                {"role": "user", "content": USER_NOTE_TAKING.format(content=extracted_text[:16000], kb_chunks=kb[:16000])},
            ],
            temperature=0.2,
        )
        raw_output = completion.choices[0].message.content or ""

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
        kb = rag.topk_text(q=req.message, k=3) or []
        completion = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful tutor. Answer questions clearly and concisely using the provided notes context."},
                {"role": "user", "content": f"User question: {req.message}\n\nNOTES CONTEXT:\n{req.context}\n\nKB:\n{kb}"}
            ],
            temperature=0.3,
        )
        reply = completion.choices[0].message.content or "I couldn't generate a response."
        return ChatResponse(reply=reply)
    except Exception as e:
        logger.error(f"chat_with_notes failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/chat", response_model=ChatResponse)
async def chat_with_notes(req: ChatRequest):
    try:
        kb = rag.topk_text(q=req.message, k=3) or []
        
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
        logger.error(f"chat_with_notes failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/health")
async def health():
    return {"ok": True}
