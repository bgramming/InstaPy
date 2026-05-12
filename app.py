from flask import Flask, render_template
from flask_cors import CORS
from pymongo import MongoClient
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    client = MongoClient(app.config["MONGO_URI"])
    app.db = client.get_default_database()

    from api.routes_api import routes_bp
    from api.stops_api import stops_bp
    from api.drivers_api import drivers_bp
    from api.optimize_api import optimize_bp
    from views import views_bp

    app.register_blueprint(routes_bp, url_prefix="/api/routes")
    app.register_blueprint(stops_bp, url_prefix="/api/stops")
    app.register_blueprint(drivers_bp, url_prefix="/api/drivers")
    app.register_blueprint(optimize_bp, url_prefix="/api/optimize")
    app.register_blueprint(views_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
