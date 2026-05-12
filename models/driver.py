from datetime import datetime, timezone

def new_driver(name, phone="", email="", vehicle="", vehicle_plate="", notes=""):
    return {
        "name": name,
        "phone": phone,
        "email": email,
        "vehicle": vehicle,
        "vehicle_plate": vehicle_plate,
        "notes": notes,
        "active": True,
        "created_at": datetime.now(timezone.utc),
    }
