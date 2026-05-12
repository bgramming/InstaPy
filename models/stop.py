import uuid

def new_stop(address, lat=None, lng=None, notes="", contact_name="", contact_phone=""):
    return {
        "id": str(uuid.uuid4()),
        "address": address,
        "lat": lat,
        "lng": lng,
        "notes": notes,
        "contact_name": contact_name,
        "contact_phone": contact_phone,
        "status": "pending",   # pending | completed | failed
        "order": 0,
    }
