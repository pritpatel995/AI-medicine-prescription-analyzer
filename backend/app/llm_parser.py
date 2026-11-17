
"""
Fast, safe prescription extraction using a local Ollama model.
"""

import json
import logging
import re

import httpx
from pydantic import ValidationError

from app.config import settings
from app.schemas import ExtractedPrescription

logger = logging.getLogger("rx_analyzer.llm_parser")

SYSTEM_PROMPT = """
Extract prescription details from OCR text.
Return one valid JSON object only, matching this structure:
{
  "doctor_name": null,
  "clinic_name": null,
  "medicines": [
    {
      "name": "medicine name without strength",
      "dosage": null,
      "form": "other",
      "frequency": null,
      "times": [],
      "instructions": null,
      "duration_days": null
    }
  ],
  "confidence_notes": null
}

Rules:
- Extract only medicines supported by the OCR text.
- Separate medicine names and strengths.
- Never guess unclear names, strengths, frequency, or duration.
- Use null for missing information.
- Use only these form values: tablet, capsule, syrup, injection,
  drops, ointment, inhaler, other.
- Use exact stated times only, in 24-hour HH:MM format.
- If strength is ambiguous, use null and explain in confidence_notes.
- Do not give medical advice.
- Return JSON only, without markdown.
"""


def _parse_json_safely(raw: str) -> dict:
    raw = raw.strip()

    if raw.startswith("```"):
        raw = re.sub(
            r"^```(?:json)?\s*", "", raw, count=1, flags=re.IGNORECASE
        )
        raw = re.sub(r"\s*```$", "", raw, count=1)

    parsed = json.loads(raw)

    if not isinstance(parsed, dict):
        raise ValueError("Ollama response must be a JSON object.")

    return parsed


def _flag_ambiguous_strengths(
    result: ExtractedPrescription,
    ocr_text: str,
) -> ExtractedPrescription:
    notes = []

    ambiguous_patterns = [
        r"\b(?:l|i|o|0)?\s*omg\b",
        r"\blong\b",
        r"\b\d+\s*[mM][gG]\s*[a-zA-Z]\b",
    ]

    ambiguous_text_found = any(
        re.search(pattern, ocr_text, flags=re.IGNORECASE)
        for pattern in ambiguous_patterns
    )

    for medicine in result.medicines:
        dosage = (medicine.dosage or "").strip().lower()

        if dosage in {"long", "lomg", "l0mg", "omg"}:
            medicine.dosage = None
            notes.append(
                f"The strength extracted for {medicine.name} is ambiguous "
                "and requires manual verification."
            )

    if ambiguous_text_found and not notes:
        notes.append(
            "The OCR contains a potentially ambiguous strength. "
            "Verify it against the original prescription."
        )

    if notes:
        existing = (result.confidence_notes or "").strip()
        result.confidence_notes = "; ".join(
            ([existing] if existing else []) + notes
        )

    return result


# Reuse the HTTP connection instead of creating a new client for every call.
_http_client = httpx.AsyncClient(timeout=90.0)


async def _call_ollama(prompt: str) -> str:
    payload = {
        "model": settings.ollama_model,
        "system": SYSTEM_PROMPT,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "keep_alive": "10m",
        "options": {
            "temperature": 0,
            "num_predict": 250,
        },
    }

    url = f"{settings.ollama_base_url.rstrip('/')}/api/generate"

    response = await _http_client.post(url, json=payload)
    response.raise_for_status()

    model_response = response.json().get("response", "")

    if not isinstance(model_response, str) or not model_response.strip():
        raise ValueError("Ollama returned an empty response.")

    return model_response


async def structure_prescription(
    ocr_text: str,
) -> ExtractedPrescription:
    if not ocr_text or not ocr_text.strip():
        return ExtractedPrescription(
            doctor_name=None,
            clinic_name=None,
            medicines=[],
            confidence_notes="No readable prescription text was provided.",
        )

    try:
        prompt = (
            "Extract the prescription details from this OCR text. "
            "Use null for uncertain fields and do not guess.\n\n"
            f"OCR TEXT:\n{ocr_text}"
        )

        raw_response = await _call_ollama(prompt)
        parsed = _parse_json_safely(raw_response)
        result = ExtractedPrescription.model_validate(parsed)

        return _flag_ambiguous_strengths(result, ocr_text)

    except (json.JSONDecodeError, ValidationError, ValueError) as exc:
        logger.warning("Prescription extraction failed validation: %s", exc)

    except httpx.HTTPError:
        logger.exception("Could not communicate with Ollama.")

    except Exception:
        logger.exception("Unexpected prescription extraction error.")

    return ExtractedPrescription(
        doctor_name=None,
        clinic_name=None,
        medicines=[],
        confidence_notes=(
            "Automatic extraction could not be completed. "
            "Enter medicine details manually and verify all information "
            "against the original prescription."
        ),
    )

