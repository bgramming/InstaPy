from datetime import datetime, timezone

def new_route(name, driver_id=None, notes=""):
    return {
        "name": name,
        "driver_id": driver_id,
        "notes": notes,
        "status": "pending",       # pending | active | completed
        "stops": [],               # list of stop dicts (embedded)
        "optimized": False,
        "total_distance_km": 0.0,
        "total_duration_min": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

def touch(route):
    route["updated_at"] = datetime.now(timezone.utc)
    return route
