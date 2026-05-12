from flask import Blueprint, render_template, current_app
from bson import ObjectId

views_bp = Blueprint("views", __name__)

def serialize(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

@views_bp.route("/")
def index():
    db = current_app.db
    total_routes = db.routes.count_documents({})
    total_drivers = db.drivers.count_documents({})
    active_routes = db.routes.count_documents({"status": "active"})
    completed_routes = db.routes.count_documents({"status": "completed"})
    recent_routes = [serialize(r) for r in db.routes.find().sort("created_at", -1).limit(5)]
    return render_template("index.html",
        total_routes=total_routes,
        total_drivers=total_drivers,
        active_routes=active_routes,
        completed_routes=completed_routes,
        recent_routes=recent_routes,
        google_maps_key=current_app.config["GOOGLE_MAPS_API_KEY"]
    )

@views_bp.route("/routes")
def routes_page():
    return render_template("routes.html",
        google_maps_key=current_app.config["GOOGLE_MAPS_API_KEY"])

@views_bp.route("/routes/<route_id>")
def route_detail(route_id):
    db = current_app.db
    route = db.routes.find_one({"_id": ObjectId(route_id)})
    if not route:
        return "Route not found", 404
    return render_template("route_detail.html",
        route_id=route_id,
        google_maps_key=current_app.config["GOOGLE_MAPS_API_KEY"])

@views_bp.route("/drivers")
def drivers_page():
    return render_template("drivers.html",
        google_maps_key=current_app.config["GOOGLE_MAPS_API_KEY"])
