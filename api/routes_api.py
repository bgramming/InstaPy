from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from datetime import datetime, timezone
from models.route import new_route, touch
from models.stop import new_stop

routes_bp = Blueprint("routes_api", __name__)

def _serialize(doc):
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _err(msg, code=400):
    return jsonify({"error": msg}), code

@routes_bp.route("/", methods=["GET"])
def list_routes():
    db = current_app.db
    status = request.args.get("status")
    query = {"status": status} if status else {}
    routes = [_serialize(r) for r in db.routes.find(query).sort("created_at", -1)]
    return jsonify(routes)

@routes_bp.route("/", methods=["POST"])
def create_route():
    db = current_app.db
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return _err("name is required")
    route = new_route(name, data.get("driver_id"), data.get("notes", ""))
    result = db.routes.insert_one(route)
    route["_id"] = str(result.inserted_id)
    return jsonify(route), 201

@routes_bp.route("/<route_id>", methods=["GET"])
def get_route(route_id):
    db = current_app.db
    try:
        route = db.routes.find_one({"_id": ObjectId(route_id)})
    except Exception:
        return _err("invalid route id", 400)
    if not route:
        return _err("route not found", 404)
    return jsonify(_serialize(route))

@routes_bp.route("/<route_id>", methods=["PUT"])
def update_route(route_id):
    db = current_app.db
    data = request.get_json() or {}
    allowed = {"name", "driver_id", "notes", "status"}
    updates = {k: v for k, v in data.items() if k in allowed}
    updates["updated_at"] = datetime.now(timezone.utc)
    try:
        result = db.routes.update_one({"_id": ObjectId(route_id)}, {"$set": updates})
    except Exception:
        return _err("invalid route id", 400)
    if result.matched_count == 0:
        return _err("route not found", 404)
    return jsonify({"ok": True})

@routes_bp.route("/<route_id>", methods=["DELETE"])
def delete_route(route_id):
    db = current_app.db
    try:
        result = db.routes.delete_one({"_id": ObjectId(route_id)})
    except Exception:
        return _err("invalid route id", 400)
    if result.deleted_count == 0:
        return _err("route not found", 404)
    return jsonify({"ok": True})

# --- Stops within a route ---

@routes_bp.route("/<route_id>/stops", methods=["POST"])
def add_stop(route_id):
    db = current_app.db
    data = request.get_json() or {}
    address = (data.get("address") or "").strip()
    if not address:
        return _err("address is required")
    stop = new_stop(
        address=address,
        lat=data.get("lat"),
        lng=data.get("lng"),
        notes=data.get("notes", ""),
        contact_name=data.get("contact_name", ""),
        contact_phone=data.get("contact_phone", ""),
    )
    try:
        route = db.routes.find_one({"_id": ObjectId(route_id)})
    except Exception:
        return _err("invalid route id", 400)
    if not route:
        return _err("route not found", 404)
    stop["order"] = len(route.get("stops", []))
    db.routes.update_one(
        {"_id": ObjectId(route_id)},
        {"$push": {"stops": stop}, "$set": {"updated_at": datetime.now(timezone.utc), "optimized": False}}
    )
    return jsonify(stop), 201

@routes_bp.route("/<route_id>/stops/<stop_id>", methods=["PUT"])
def update_stop(route_id, stop_id):
    db = current_app.db
    data = request.get_json() or {}
    allowed = {"status", "notes", "contact_name", "contact_phone", "address", "lat", "lng"}
    updates = {f"stops.$.{k}": v for k, v in data.items() if k in allowed}
    updates["updated_at"] = datetime.now(timezone.utc)
    try:
        result = db.routes.update_one(
            {"_id": ObjectId(route_id), "stops.id": stop_id},
            {"$set": updates}
        )
    except Exception:
        return _err("invalid id", 400)
    if result.matched_count == 0:
        return _err("route or stop not found", 404)
    return jsonify({"ok": True})

@routes_bp.route("/<route_id>/stops/<stop_id>", methods=["DELETE"])
def delete_stop(route_id, stop_id):
    db = current_app.db
    try:
        result = db.routes.update_one(
            {"_id": ObjectId(route_id)},
            {"$pull": {"stops": {"id": stop_id}}, "$set": {"updated_at": datetime.now(timezone.utc), "optimized": False}}
        )
    except Exception:
        return _err("invalid id", 400)
    if result.matched_count == 0:
        return _err("route not found", 404)
    return jsonify({"ok": True})

@routes_bp.route("/<route_id>/stops/reorder", methods=["PUT"])
def reorder_stops(route_id):
    """Accept an ordered list of stop IDs and reorder the stops array."""
    db = current_app.db
    data = request.get_json() or {}
    ordered_ids = data.get("order", [])
    try:
        route = db.routes.find_one({"_id": ObjectId(route_id)})
    except Exception:
        return _err("invalid route id", 400)
    if not route:
        return _err("route not found", 404)
    stops_by_id = {s["id"]: s for s in route.get("stops", [])}
    reordered = []
    for i, sid in enumerate(ordered_ids):
        if sid in stops_by_id:
            s = stops_by_id[sid]
            s["order"] = i
            reordered.append(s)
    db.routes.update_one(
        {"_id": ObjectId(route_id)},
        {"$set": {"stops": reordered, "updated_at": datetime.now(timezone.utc)}}
    )
    return jsonify({"ok": True})
