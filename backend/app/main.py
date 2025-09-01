# backend/app/main.py
from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import os

from app.recorder import transcribe_file
from app.extractor import extract_bill_details
from app.bill_generator import generate_pdf
from app.db import (
    add_or_update_product, get_products, get_product, update_product, delete_product,
    update_global_gst, get_price_and_gst_by_name,
    insert_template, list_templates, get_template_file_by_id, delete_template,
    save_bill, stats_counts
)

BASE_DIR = Path(__file__).resolve().parent           # backend/app
ROOT_DIR = BASE_DIR.parent.parent                    # project root
FRONTEND_DIR = ROOT_DIR / "frontend"
TEMPLATE_STORE = BASE_DIR / "templates"
GENERATED_DIR = BASE_DIR / "generated_bills"
TEMPLATE_STORE.mkdir(exist_ok=True)
GENERATED_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Voice Bill Generator")

# CORS (same host pe chal raha to optional hai)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

# Serve static + HTML
app.mount("/static", StaticFiles(directory=FRONTEND_DIR / "static"), name="static")

@app.get("/", include_in_schema=False)
def home():
    file = FRONTEND_DIR / "templates" / "index.html"
    if not file.exists():
        raise HTTPException(404, "index.html not found")
    return FileResponse(file)

@app.get("/admin", include_in_schema=False)
def admin_page():
    file = FRONTEND_DIR / "templates" / "admin.html"
    if not file.exists():
        raise HTTPException(404, "admin.html not found")
    return FileResponse(file)

# ---------------- Templates ----------------
@app.post("/upload-template")
async def upload_template(template: UploadFile, template_name: str = Form(...)):
    ext = (template.filename.split(".")[-1] or "").lower()
    if ext not in {"pdf", "jpg", "jpeg", "png"}:
        raise HTTPException(400, "Only PDF/JPG/PNG allowed")
    # save file
    save_path = TEMPLATE_STORE / template.filename
    with open(save_path, "wb") as f:
        shutil.copyfileobj(template.file, f)
    # DB record
    tid = insert_template(template_name, template.filename, ext)
    return {"status": "success", "id": tid, "name": template_name, "file_type": ext}

@app.get("/api/templates")
def api_templates():
    return {"templates": list_templates()}

@app.delete("/api/templates/{template_id}")
def api_delete_template(template_id: int):
    file_name = get_template_file_by_id(template_id)
    if not file_name:
        raise HTTPException(404, "Template not found")
    file_path = TEMPLATE_STORE / file_name
    if file_path.exists():
        try: file_path.unlink()
        except: pass
    delete_template(template_id)
    return {"message": "Template deleted"}

# ---------------- Products CRUD ----------------
@app.get("/api/products")
def api_get_products():
    return {"products": get_products()}

@app.get("/api/products/{product_id}")
def api_get_product(product_id: int):
    p = get_product(product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    return {"product": p}

@app.post("/api/products")
async def api_add_product(name: str = Form(...), price: float = Form(...), gst_percent: float = Form(...)):
    add_or_update_product(name, price, gst_percent)
    return {"message": f"Product '{name}' saved."}

@app.put("/api/products/{product_id}")
async def api_update_product(product_id: int, name: str = Form(...), price: float = Form(...), gst_percent: float = Form(...)):
    if not get_product(product_id):
        raise HTTPException(404, "Product not found")
    update_product(product_id, name, price, gst_percent)
    return {"message": "Product updated."}

@app.delete("/api/products/{product_id}")
def api_delete_product(product_id: int):
    if not get_product(product_id):
        raise HTTPException(404, "Product not found")
    delete_product(product_id)
    return {"message": "Product deleted."}

@app.post("/api/global-gst")
def api_global_gst(gst_percent: float = Form(...)):
    update_global_gst(gst_percent)
    return {"message": f"Global GST updated to {gst_percent}%."}

# ---------------- Stats ----------------
@app.get("/api/stats")
def api_stats():
    return {"stats": stats_counts()}

# ---------------- Voice → Bill ----------------
def _parse_qty(qty_str: str):
    """
    '3 kg' -> (3.0, 'kg'), '2 litre'->(2,'litre'), '5'->(5,'pcs')
    """
    if not qty_str:
        return 1.0, "pcs"
    s = qty_str.lower().strip()
    tokens = s.split()
    num = 1.0
    unit = "pcs"
    try:
        # support '2kg' also
        if len(tokens) == 1 and any(u in s for u in ["kg","kilo","g","gm","l","ltr","litre","ml","pcs","piece","pc"]):
            # separate digits and letters
            num_part = "".join(ch for ch in s if ch.isdigit() or ch == ".")
            unit_part = "".join(ch for ch in s if ch.isalpha())
            if num_part:
                num = float(num_part)
            if unit_part:
                unit = unit_part
        else:
            num = float(tokens[0])
            if len(tokens) > 1:
                unit = tokens[1]
    except:
        pass
    # normalize unit labels
    if unit in ["kilo","kgs"]: unit = "kg"
    if unit in ["ltr","l"]: unit = "litre"
    if unit in ["g","gm","grams"]: unit = "g"
    if unit in ["ml"]: unit = "ml"
    if unit in ["pc","piece","pieces"]: unit = "pcs"
    return num, unit

@app.post("/process-voice")
async def process_voice(audio_file: UploadFile, template_id: str = Form(None)):
    # 1) save uploaded audio
    tmp_path = BASE_DIR / f"tmp_{audio_file.filename}"
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(audio_file.file, f)

    # 2) transcribe
    raw_text = transcribe_file(str(tmp_path))

    # 3) extract JSON (customer, phone, address, items[])
    extracted = extract_bill_details(raw_text or "")


    # 4) price + GST calc
    items_out = []
    subtotal = 0.0
    total_gst = 0.0

    for it in extracted.get("items", []):
        name = (it.get("name") or "").strip()
        qty_str = (it.get("quantity") or "1").strip()
        qty, unit = _parse_qty(qty_str)

        unit_price, gst_percent = get_price_and_gst_by_name(name)
        unit_price = unit_price or 0.0
        gst_percent = gst_percent or 0.0

        line_base = qty * unit_price
        gst_amount = line_base * (gst_percent / 100.0)
        line_total = line_base + gst_amount

        subtotal += line_base
        total_gst += gst_amount

        items_out.append({
            "name": name,
            "quantity": qty,
            "unit": unit,
            "unit_price": unit_price,
            "gst_percent": gst_percent,
            "gst_amount": gst_amount,
            "total_price": line_total,  # for preview compatibility
            "line_total": line_total
        })

    grand_total = subtotal + total_gst

    bill_info = {
    "customer_name": extracted.get("customer") or "Unknown",
    "phone": extracted.get("Phone") or extracted.get("phone") or "",
    "address": extracted.get("Address") or extracted.get("address") or ""
    }


    # 5) generate PDF
    pdf_path = generate_pdf(bill_info, items_out, {
        "subtotal": subtotal,
        "total_gst": total_gst,
        "grand_total": grand_total
    })

    # 6) save bill for stats
    try:
        save_bill(bill_info["customer_name"], grand_total)
    except:
        pass

    # clean temp
    try: os.remove(tmp_path)
    except: pass

    # 7) response to frontend
    return {
        "bill_data": {
            "customer_name": bill_info["customer_name"],
            "customer_phone": bill_info["phone"],
            "customer_address": bill_info["address"],
            "products": items_out,
            "subtotal": subtotal,
            "total_gst": total_gst,
            "total_amount": grand_total
        },
        # frontend/script.js expects a path then it extracts filename
        "bill_path": pdf_path
    }

# ---------------- Download Bill ----------------
@app.get("/download-bill/{filename}")
async def download_bill(filename: str):
    file_path = GENERATED_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(file_path), filename=filename, media_type="application/pdf")
