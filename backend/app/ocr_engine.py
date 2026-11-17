
"""
Fast prescription OCR using EasyOCR and OpenCV.

Runs one OCR pass normally and a second pass only when the first
result appears insufficient. Keeps the existing API response format.
"""

import logging
from functools import lru_cache

import cv2
import numpy as np
import torch

logger = logging.getLogger("rx_analyzer.ocr")


@lru_cache(maxsize=1)
def get_reader():
    """Load EasyOCR once and reuse it."""
    import easyocr

    logger.info("Loading EasyOCR reader...")

    return easyocr.Reader(
        ["en"],
        gpu=torch.cuda.is_available(),
    )


def _decode_image(image_bytes: bytes) -> np.ndarray:
    if not image_bytes:
        raise ValueError("The uploaded image is empty.")

    image = cv2.imdecode(
        np.frombuffer(image_bytes, dtype=np.uint8),
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise ValueError("Could not read the uploaded image.")

    return image


def _prepare_image(image: np.ndarray) -> np.ndarray:
    """Resize small images and prepare grayscale OCR input."""
    height, width = image.shape[:2]

    if height == 0 or width == 0:
        raise ValueError("The uploaded image has invalid dimensions.")

    # Avoid enlarging images excessively.
    target_width = 1400

    if width < target_width:
        scale = target_width / width
        image = cv2.resize(
            image,
            (target_width, int(height * scale)),
            interpolation=cv2.INTER_CUBIC,
        )

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Improve contrast without running expensive denoising.
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    )

    return clahe.apply(gray)


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Compatibility helper for existing imports."""
    return _prepare_image(_decode_image(image_bytes))


def _read_variant(reader, image: np.ndarray) -> list[dict]:
    """Run OCR and normalize the detected text."""
    results = reader.readtext(
        image,
        detail=1,
        paragraph=False,
        batch_size=1,
        min_size=8,
        text_threshold=0.5,
        low_text=0.3,
        link_threshold=0.3,
        mag_ratio=1.0,
    )

    lines = []

    for item in results:
        if len(item) < 2:
            continue

        text = str(item[1]).strip()

        if not text:
            continue

        try:
            confidence = max(0.0, min(1.0, float(item[2])))
        except (TypeError, ValueError, IndexError):
            confidence = None

        try:
            x = min(float(point[0]) for point in item[0])
            y = min(float(point[1]) for point in item[0])
        except (TypeError, ValueError, IndexError):
            x, y = 0.0, 0.0

        lines.append({
            "text": text,
            "confidence": confidence,
            "_x": x,
            "_y": y,
        })

    lines.sort(key=lambda line: (line["_y"], line["_x"]))

    return lines


def _needs_retry(lines: list[dict]) -> bool:
    """
    Retry when OCR detects little text or has generally low confidence.
    This is a simple heuristic, not a guarantee of OCR accuracy.
    """
    if len(lines) < 5:
        return True

    scores = [
        line["confidence"]
        for line in lines
        if line["confidence"] is not None
    ]

    return bool(scores) and (
        sum(scores) / len(scores) < 0.55
    )


def _merge_results(variants: list[list[dict]]) -> list[dict]:
    """Merge duplicate text while preserving additional detections."""
    merged = []
    seen = set()

    for variant in variants:
        for line in variant:
            text = line["text"].strip()
            normalized = " ".join(text.lower().split())

            if not normalized or normalized in seen:
                continue

            seen.add(normalized)
            merged.append(line.copy())

    merged.sort(key=lambda line: (line["_y"], line["_x"]))

    return merged


def extract_text_with_confidence(image_bytes: bytes) -> dict:
    """
    Return OCR text in the existing API-compatible format.
    """
    image = _decode_image(image_bytes)
    prepared = _prepare_image(image)
    reader = get_reader()

    try:
        first_pass = _read_variant(reader, prepared)

        logger.info(
            "OCR first pass detected %s text lines",
            len(first_pass),
        )

        results_by_variant = [first_pass]

        if _needs_retry(first_pass):
            logger.info(
                "OCR result appears insufficient; running fallback pass."
            )

            # Try thresholding only when the first result appears poor.
            thresholded = cv2.adaptiveThreshold(
                prepared,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                31,
                11,
            )

            second_pass = _read_variant(reader, thresholded)
            results_by_variant.append(second_pass)

            logger.info(
                "OCR fallback detected %s text lines",
                len(second_pass),
            )

    except Exception:
        logger.exception("OCR processing failed.")
        raise

    merged_lines = _merge_results(results_by_variant)

    lines = [
        {
            "text": line["text"],
            "confidence": (
                round(line["confidence"], 4)
                if line["confidence"] is not None
                else None
            ),
        }
        for line in merged_lines
    ]

    scores = [
        line["confidence"]
        for line in lines
        if line["confidence"] is not None
    ]

    average_confidence = (
        round(sum(scores) / len(scores), 4)
        if scores
        else None
    )

    text = "\n".join(line["text"] for line in lines)

    logger.info(
        "OCR completed: %s unique lines detected",
        len(lines),
    )

    return {
        "text": text,
        "lines": lines,
        "average_confidence": average_confidence,
    }


def extract_text(image_bytes: bytes) -> str:
    """Backward-compatible text-only OCR helper."""
    return extract_text_with_confidence(image_bytes)["text"]

