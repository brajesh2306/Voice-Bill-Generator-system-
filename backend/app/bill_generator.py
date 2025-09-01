# backend/app/bill_generator.py
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
OUT_DIR = BASE_DIR / "generated_bills"
OUT_DIR.mkdir(exist_ok=True)

def generate_pdf(bill_info: dict, items: list, totals: dict) -> str:
    """
    bill_info: {"customer_name","phone","address"}
    items: [{"name","qty","unit","unit_price","gst_percent","line_total","gst_amount"}]
    totals: {"subtotal","total_gst","grand_total"}
    Returns absolute file path.
    """
    fname = f"bill_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    pdf_path = OUT_DIR / fname

    c = canvas.Canvas(str(pdf_path), pagesize=A4)
    width, height = A4

    y = height - 30*mm
    c.setFont("Helvetica-Bold", 16)
    c.drawString(70*mm, y, "Shopkeeper Bill")
    y -= 12*mm

    c.setFont("Helvetica", 11)
    c.drawString(15*mm, y, f"Customer: {bill_info.get('customer_name','')}")
    y -= 6*mm
    c.drawString(15*mm, y, f"Phone: {bill_info.get('phone','')}")
    y -= 6*mm
    c.drawString(15*mm, y, f"Address: {bill_info.get('address','')}")
    y -= 12*mm

    # Table header
    c.setFont("Helvetica-Bold", 11)
    c.drawString(15*mm, y, "Product")
    c.drawString(80*mm, y, "Qty")
    c.drawString(100*mm, y, "Unit Price")
    c.drawString(130*mm, y, "GST%")
    c.drawString(150*mm, y, "Total")
    y -= 6*mm
    c.line(15*mm, y, 195*mm, y)
    y -= 6*mm

    c.setFont("Helvetica", 10)
    for it in items:
        c.drawString(15*mm, y, str(it.get("name","")))
        c.drawString(80*mm, y, f"{it.get('qty',0)} {it.get('unit','')}")
        c.drawString(100*mm, y, f"₹{it.get('unit_price',0):.2f}")
        c.drawString(130*mm, y, f"{it.get('gst_percent',0)}")
        c.drawString(150*mm, y, f"₹{it.get('line_total',0):.2f}")
        y -= 6*mm
        if y < 30*mm:
            c.showPage()
            y = height - 30*mm

    y -= 6*mm
    c.line(120*mm, y, 195*mm, y); y -= 6*mm

    c.setFont("Helvetica-Bold", 11)
    c.drawString(120*mm, y, "Subtotal:")
    c.drawRightString(195*mm, y, f"₹{totals.get('subtotal',0):.2f}"); y -= 6*mm
    c.drawString(120*mm, y, "Total GST:")
    c.drawRightString(195*mm, y, f"₹{totals.get('total_gst',0):.2f}"); y -= 6*mm
    c.drawString(120*mm, y, "Grand Total:")
    c.drawRightString(195*mm, y, f"₹{totals.get('grand_total',0):.2f}"); y -= 12*mm

    c.setFont("Helvetica", 9)
    c.drawString(15*mm, 15*mm, f"Generated: {datetime.now().strftime('%d-%m-%Y %H:%M')}")
    c.save()
    return str(pdf_path)
