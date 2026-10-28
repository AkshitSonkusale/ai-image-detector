"""
FastAPI backend for AI-generated image detection.

Endpoints:
  POST /predict  – multipart image → label + confidence + Grad-CAM heatmap
  GET  /health   – liveness + model name
"""

from __future__ import annotations

import io
import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from model import get_detector

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-image-detector")


# ---------------------------------------------------------------------------
# Lifespan – load model once at startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading model …")
    get_detector()  # forces load
    logger.info("Model ready")
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="AI Image Detector",
    description="REAL vs AI-GENERATED classification with Grad-CAM heatmaps",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – Vercel + local Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://*.vercel.app",  # wildcard not fully supported; add concrete URLs in prod
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _validate_upload(file: UploadFile) -> None:
    if file.content_type and file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: JPEG, PNG, WebP.",
        )
    # extension fallback
    name = (file.filename or "").lower()
    if name and not any(name.endswith(ext) for ext in ALLOWED_EXT):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported extension. Allowed: {', '.join(ALLOWED_EXT)}",
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "model": "efficientnet_b0"}


@app.post("/predict")
async def predict(
    file: Annotated[UploadFile, File(description="Image file (jpg/png/webp, ≤ 5 MB)")],
):
    _validate_upload(file)

    # Read & size-check
    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(raw) / 1e6:.1f} MB). Maximum is 5 MB.",
        )
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    # Decode image
    try:
        image = Image.open(io.BytesIO(raw))
        image.load()  # force decode
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Could not decode image. Is it a valid JPEG/PNG/WebP?")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image error: {e}")

    # Run inference
    try:
        detector = get_detector()
        result = detector.predict(image)
    except Exception as e:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")

    return JSONResponse(content=result)
