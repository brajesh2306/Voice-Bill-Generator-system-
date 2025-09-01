from app.recorder import record_and_transcribe
from app.extractor import extract_bill_details

def run_pipeline():
    # Step 1: Voice → Text
    text = record_and_transcribe(duration=5)

    # Step 2: Text → JSON (via Gemini)
    bill_json = extract_bill_details(text)

    return {
        "raw_text": text,
        "bill_json": bill_json
    }
