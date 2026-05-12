from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from datetime import datetime, timezone
from services.optimization import optimize_stops
from services.geocoding import geocode_address

optimize_bp = Blueprint("optimize_api", __name__)

def _err(msg, code=400):
    return jsonify({"error": msg}), code

@optimize_bp.route("/<route_id>", methods=["POST"])
def optimize_route(route_id):
    """
    Geocode any stops missing lat/lng, then run TSP optimization.
    Returns the reordered stops and saves them to the route.
    """
    db = current_app.db
    api_key = current_app.config["GOOGLE_MAPS_API_KEY"]

    try:
        route = db.routes.find_one({"_id": ObjectId(route_id)})
    except Exception:
        return _err("invalid route id", 400)
    if not route:
        return _err("route not found", 404)

    stops = route.get("stops", [])
    if len(stops) < 2:
        return _err("need at least 2 stops to optimize")

    # Geocode stops that don't have coordinates
    geocoded_count = 0
    for stop in stops:
        if stop.get("lat") is None or stop.get("lng") is None:
            if api_key:
                coords = geocode_address(stop["address"], api_key)
                if coords:
                    stop["lat"], stop["lng"] = coords
                    geocoded_count += 1
            # If no API key or geocoding failed, skip — optimizer will use index order

    # Run optimization (nearest-neighbor TSP)
    data = request.get_json() or {}
    depot_index = int(data.get("depot_index", 0))
    optimized = optimize_stops(stops, depot_index=depot_index)

    # Assign new order values
    for i, stop in enumerate(optimized):
        stop["order"] = i

    # Compute rough total distance
    total_km = _total_haversine_km(optimized)

    db.routes.update_one(
        {"_id": ObjectId(route_id)},
        {"$set": {
            "stops": optimized,
            "optimized": True,
            "total_distance_km": round(total_km, 2),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    return jsonify({
        "ok": True,
        "stops": optimized,
        "total_distance_km": round(total_km, 2),
        "geocoded_count": geocoded_count,
    })

@optimize_bp.route("/geocode", methods=["POST"])
def geocode():
    """Geocode a single address."""
    api_key = current_app.config["GOOGLE_MAPS_API_KEY"]
    if not api_key:
        return _err("GOOGLE_MAPS_API_KEY not configured", 503)
    data = request.get_json() or {}
    address = (data.get("address") or "").strip()
    if not address:
        return _err("address is required")
    coords = geocode_address(address, api_key)
    if not coords:
        return _err("could not geocode address", 422)
    return jsonify({"lat": coords[0], "lng": coords[1]})

def _total_haversine_km(stops):
    from math import radians, sin, cos, sqrt, atan2
    total = 0.0
    for i in range(len(stops) - 1):
        a, b = stops[i], stops[i + 1]
        if None in (a.get("lat"), a.get("lng"), b.get("lat"), b.get("lng")):
            continue
        lat1, lon1 = radians(a["lat"]), radians(a["lng"])
        lat2, lon2 = radians(b["lat"]), radians(b["lng"])
        dlat, dlon = lat2 - lat1, lon2 - lon1
        h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        total += 6371 * 2 * atan2(sqrt(h), sqrt(1 - h))
    return total
