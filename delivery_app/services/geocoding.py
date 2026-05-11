import requests

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

def geocode_address(address, api_key):
    """Return (lat, lng) tuple or None if geocoding fails."""
    try:
        resp = requests.get(GEOCODE_URL, params={"address": address, "key": api_key}, timeout=5)
        data = resp.json()
        if data.get("status") == "OK":
            loc = data["results"][0]["geometry"]["location"]
            return (loc["lat"], loc["lng"])
    except Exception:
        pass
    return None
