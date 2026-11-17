import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from app.auth import get_current_user
from app.llm_parser import structure_prescription
from app.ocr_engine import extract_text_with_confidence
from app.schemas import ScanResponse

router = APIRouter(prefix="/api/scan", tags=["scan"])
logger = logging.getLogger("rx_analyzer.scan")
MAX_UPLOAD_BYTES = 12 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/heic", "image/webp"}

@router.post("", response_model=ScanResponse)
async def scan_prescription(file: UploadFile, current_user: dict = Depends(get_current_user)):
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported content type: {content_type or 'unknown'}")
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 12MB limit")
    try:
        ocr = extract_text_with_confidence(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("OCR pipeline failed")
        raise HTTPException(status_code=500, detail="OCR processing failed")
    raw_text = ocr["text"]
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="No readable text detected in image. Try retaking the photo with better lighting.")
    extracted = await structure_prescription(raw_text)
    return ScanResponse(raw_ocr_text=raw_text, extracted=extracted, source_image_id=str(uuid.uuid4()), ocr_lines=ocr["lines"], ocr_average_confidence=ocr["average_confidence"])
