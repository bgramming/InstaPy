from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from models.driver import new_driver

drivers_bp = Blueprint("drivers_api", __name__)

def _serialize(doc):
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _err(msg, code=400):
    return jsonify({"error": msg}), code

@drivers_bp.route("/", methods=["GET"])
def list_drivers():
    db = current_app.db
    active_only = request.args.get("active", "false").lower() == "true"
    query = {"active": True} if active_only else {}
    drivers = [_serialize(d) for d in db.drivers.find(query).sort("name", 1)]
    return jsonify(drivers)

@drivers_bp.route("/", methods=["POST"])
def create_driver():
    db = current_app.db
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return _err("name is required")
    driver = new_driver(
        name=name,
        phone=data.get("phone", ""),
        email=data.get("email", ""),
        vehicle=data.get("vehicle", ""),
        vehicle_plate=data.get("vehicle_plate", ""),
        notes=data.get("notes", ""),
    )
    result = db.drivers.insert_one(driver)
    driver["_id"] = str(result.inserted_id)
    return jsonify(driver), 201

@drivers_bp.route("/<driver_id>", methods=["GET"])
def get_driver(driver_id):
    db = current_app.db
    try:
        driver = db.drivers.find_one({"_id": ObjectId(driver_id)})
    except Exception:
        return _err("invalid driver id", 400)
    if not driver:
        return _err("driver not found", 404)
    return jsonify(_serialize(driver))

@drivers_bp.route("/<driver_id>", methods=["PUT"])
def update_driver(driver_id):
    db = current_app.db
    data = request.get_json() or {}
    allowed = {"name", "phone", "email", "vehicle", "vehicle_plate", "notes", "active"}
    updates = {k: v for k, v in data.items() if k in allowed}
    try:
        result = db.drivers.update_one({"_id": ObjectId(driver_id)}, {"$set": updates})
    except Exception:
        return _err("invalid driver id", 400)
    if result.matched_count == 0:
        return _err("driver not found", 404)
    return jsonify({"ok": True})

@drivers_bp.route("/<driver_id>", methods=["DELETE"])
def delete_driver(driver_id):
    db = current_app.db
    try:
        result = db.drivers.update_one({"_id": ObjectId(driver_id)}, {"$set": {"active": False}})
    except Exception:
        return _err("invalid driver id", 400)
    if result.matched_count == 0:
        return _err("driver not found", 404)
    return jsonify({"ok": True})

@drivers_bp.route("/<driver_id>/routes", methods=["GET"])
def driver_routes(driver_id):
    db = current_app.db
    routes = []
    for r in db.routes.find({"driver_id": driver_id}).sort("created_at", -1):
        r["_id"] = str(r["_id"])
        routes.append(r)
    return jsonify(routes)
