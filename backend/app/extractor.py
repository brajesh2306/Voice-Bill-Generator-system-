# backend/app/extractor.py
import os
import json
import re
import google.generativeai as genai

# ✅ Hardcode API key directly
API_KEY = "AIzaSyDkIzwjkHR_lSziUIjyWuvu9uiLEeZCiU8"

if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    print("WARNING: GEMINI_API_KEY not set. Extraction will not work.")

def _clean_json(text: str) -> str:
    # remove triple backticks etc.
    t = re.sub(r"^```json|^```|```$", "", text.strip(), flags=re.MULTILINE).strip()
    # remove leading junk lines before first '{'
    idx = t.find("{")
    return t[idx:] if idx != -1 else t

def extract_bill_details(raw_text: str):
    """
    Returns dict:
    {
      "customer": "...",
      "phone": "...",
      "address": "...",
      "items": [{"name":"Sugar","quantity":"2 kg"}, ...]
    }
    """
    prompt = f"""
                You are a billing assistant.
            you have to use your knowledge of common Indian grocery items to correct any misspelled product names.and also identify the customer and product names
            Extract customer name and purchased items from this text and users phone number and address if mentioned understand according to Indian context.
            and you have to also check the item repetation and combine them into one item with total quantity if the item name is same 

            Input: "{raw_text}"

            Output the result strictly in JSON format only:
            {{
                "customer": "Customer Name",
                "items": [
                    {{"name": "product1", "quantity": "X"}},
                    {{"name": "product2", "quantity": "Y"}}
                ]
                "Phone": "Customer Phone Number",
                "Address": "Customer Address"
            }}

        """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        resp = model.generate_content(prompt)
        text = _clean_json(resp.text or "")
        print("Gemini response:", text)
        return json.loads(text)
    except Exception as e:
        # safe fallback so pipeline doesn't break
        return {"customer": "", "phone": "", "address": "", "items": [], "error": str(e)}
