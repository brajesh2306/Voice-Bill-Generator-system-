# backend/app/db.py
import sqlite3
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "products.db"

def _conn():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = _conn()
    c = conn.cursor()

    # Products table: price is per unit (kg/litre/pcs as per business), gst in %
    c.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        price REAL NOT NULL,
        gst_percent REAL NOT NULL DEFAULT 0
    )
    """)

    # Templates table
    c.execute("""
    CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # Bills table (for stats)
    c.execute("""
    CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        total_amount REAL,
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()

# ---------- Products ----------
def add_or_update_product(name: str, price: float, gst_percent: float):
    conn = _conn()
    c = conn.cursor()
    c.execute("""
        INSERT INTO products (name, price, gst_percent)
        VALUES (?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET price=excluded.price, gst_percent=excluded.gst_percent
    """, (name.strip(), float(price), float(gst_percent)))
    conn.commit()
    conn.close()

def get_products():
    conn = _conn()
    c = conn.cursor()
    rows = c.execute("SELECT id, name, price, gst_percent FROM products ORDER BY id DESC").fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "price": r[2], "gst_percent": r[3]} for r in rows]

def get_product(product_id: int):
    conn = _conn()
    c = conn.cursor()
    r = c.execute("SELECT id, name, price, gst_percent FROM products WHERE id=?", (product_id,)).fetchone()
    conn.close()
    if not r:
        return None
    return {"id": r[0], "name": r[1], "price": r[2], "gst_percent": r[3]}

def get_price_and_gst_by_name(name: str):
    conn = _conn()
    c = conn.cursor()
    r = c.execute("SELECT price, gst_percent FROM products WHERE LOWER(name)=LOWER(?)", (name.strip(),)).fetchone()
    conn.close()
    if not r:
        return None, None
    return r[0], r[1]

def update_product(product_id: int, name: str, price: float, gst_percent: float):
    conn = _conn()
    c = conn.cursor()
    c.execute("UPDATE products SET name=?, price=?, gst_percent=? WHERE id=?",
              (name.strip(), float(price), float(gst_percent), int(product_id)))
    conn.commit()
    conn.close()

def delete_product(product_id: int):
    conn = _conn()
    c = conn.cursor()
    c.execute("DELETE FROM products WHERE id=?", (int(product_id),))
    conn.commit()
    conn.close()

def update_global_gst(gst_percent: float):
    conn = _conn()
    c = conn.cursor()
    c.execute("UPDATE products SET gst_percent=?", (float(gst_percent),))
    conn.commit()
    conn.close()

# ---------- Templates ----------
def insert_template(name: str, file_name: str, file_type: str) -> int:
    conn = _conn()
    c = conn.cursor()
    created = datetime.utcnow().isoformat()
    c.execute("INSERT INTO templates (name, file_name, file_type, created_at) VALUES (?, ?, ?, ?)",
              (name, file_name, file_type.lower(), created))
    conn.commit()
    tid = c.lastrowid
    conn.close()
    return tid

def list_templates():
    conn = _conn()
    c = conn.cursor()
    rows = c.execute("SELECT id, name, file_name, file_type, created_at FROM templates ORDER BY id DESC").fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "file_name": r[2], "file_type": r[3], "created_at": r[4]} for r in rows]

def get_template_file_by_id(tid: int):
    conn = _conn()
    c = conn.cursor()
    r = c.execute("SELECT file_name FROM templates WHERE id=?", (int(tid),)).fetchone()
    conn.close()
    return r[0] if r else None

def delete_template(tid: int):
    conn = _conn()
    c = conn.cursor()
    c.execute("DELETE FROM templates WHERE id=?", (int(tid),))
    conn.commit()
    conn.close()

# ---------- Bills ----------
def save_bill(customer_name: str, total_amount: float):
    conn = _conn()
    c = conn.cursor()
    c.execute("INSERT INTO bills (customer_name, total_amount, created_at) VALUES (?, ?, ?)",
              (customer_name, float(total_amount), datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def stats_counts():
    conn = _conn()
    c = conn.cursor()
    p = c.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    t = c.execute("SELECT COUNT(*) FROM templates").fetchone()[0]
    # last 30 days bills
    cutoff = (datetime.utcnow().timestamp() - 30*24*3600)
    rows = c.execute("SELECT created_at FROM bills").fetchall()
    recent = 0
    for (ts,) in rows:
        try:
            if datetime.fromisoformat(ts).timestamp() >= cutoff:
                recent += 1
        except:
            pass
    conn.close()
    return {"total_products": p, "total_templates": t, "recent_bills": recent}

# init on import
init_db()
