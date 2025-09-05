from __future__ import annotations
import json, os, uuid
from dataclasses import dataclass
from typing import List, Dict, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from openai import OpenAI

# Store original proxy settings and clear them
original_proxies = {}
proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
for var in proxy_vars:
    if var in os.environ:
        original_proxies[var] = os.environ[var]
        del os.environ[var]

A4F_BASE = os.getenv("A4F_BASE_URL", "https://api.a4f.co/v1")
A4F_KEY = os.getenv("A4F_API_KEY", "")
EMBED_MODEL = os.getenv("A4F_EMBED_MODEL", "provider-3/text-embedding-3-small")

try:
    # Try to initialize without any special configuration first
    client = OpenAI(api_key=A4F_KEY, base_url=A4F_BASE)
except TypeError as e:
    if "proxies" in str(e):
        # If that fails due to proxy issues, use httpx with trust_env=False
        import httpx
        http_client = httpx.Client(trust_env=False)
        client = OpenAI(
            api_key=A4F_KEY, 
            base_url=A4F_BASE,
            http_client=http_client
        )
    else:
        raise

# Restore original proxy settings for other parts of the application
for var, value in original_proxies.items():
    os.environ[var] = value

@dataclass
class DocChunk:
    id: str
    text: str
    embedding: np.ndarray
    meta: Dict

class SimpleRAG:
    def __init__(self, db_path: str = "rag_db.json"):
        self.db_path = db_path
        self.chunks: List[DocChunk] = []
        self._load()

    def _load(self):
        if not os.path.exists(self.db_path):
            self._save()
        with open(self.db_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        self.chunks = [
            DocChunk(c["id"], c["text"], np.array(c["embedding"], dtype=float), c["meta"])
            for c in raw
        ]

    def _save(self):
        raw = [
            dict(id=c.id, text=c.text, embedding=c.embedding.tolist(), meta=c.meta)
            for c in self.chunks
        ]
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False, indent=2)

    def _embed(self, texts: List[str]) -> List[List[float]]:
        resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
        return [d.embedding for d in resp.data]

    def add_document(
        self,
        text: str,
        meta: Dict | None = None,
        chunk_size: int = 800,
        overlap: int = 120,
    ):
        meta = meta or {}
        i = 0
        new_chunks = []
        while i < len(text):
            chunk = text[i : i + chunk_size]
            new_chunks.append(chunk)
            i += chunk_size - overlap
        embs = self._embed(new_chunks)
        for t, e in zip(new_chunks, embs):
            self.chunks.append(
                DocChunk(id=str(uuid.uuid4()), text=t, embedding=np.array(e), meta=meta)
            )
        self._save()

    def query(self, q: str, k: int = 5) -> List[Tuple[float, DocChunk]]:
        if not self.chunks:
            return []
        q_emb = np.array(self._embed([q])[0]).reshape(1, -1)
        mat = np.vstack([c.embedding for c in self.chunks])
        sims = cosine_similarity(q_emb, mat).flatten()
        order = np.argsort(-sims)[:k]
        return [(float(sims[i]), self.chunks[i]) for i in order]

    def topk_text(self, q: str, k: int = 5) -> str:
        pairs = self.query(q, k)
        lines = []
        for score, c in pairs:
            src = c.meta.get("source", "unknown")
            lines.append(f"[score={score:.3f} source={src}]\n{c.text}")
        return "\n\n".join(lines)