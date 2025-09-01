from pydantic import BaseModel
from typing import List, Dict

class BillRequest(BaseModel):
    customer_name: str
    phone: str
    address: str
    products: List[Dict]   # [{ "name": "sugar", "quantity": 2 }]
