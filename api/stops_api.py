from flask import Blueprint, jsonify

stops_bp = Blueprint("stops_api", __name__)

# Stop CRUD is handled via /api/routes/<id>/stops
# This blueprint is reserved for future cross-route stop operations

@stops_bp.route("/", methods=["GET"])
def info():
    return jsonify({"info": "Stop operations are available at /api/routes/<route_id>/stops"})
