"""
Route optimization using the nearest-neighbor heuristic (TSP approximation).
Works entirely offline using Haversine distances when lat/lng are available,
or falls back to original insertion order for stops without coordinates.
"""
from math import radians, sin, cos, sqrt, atan2

def _haversine_km(a, b):
    if None in (a.get("lat"), a.get("lng"), b.get("lat"), b.get("lng")):
        return float("inf")
    lat1, lon1 = radians(a["lat"]), radians(a["lng"])
    lat2, lon2 = radians(b["lat"]), radians(b["lng"])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 6371 * 2 * atan2(sqrt(h), sqrt(1 - h))

def optimize_stops(stops, depot_index=0):
    """
    Run nearest-neighbor TSP starting from depot_index.
    Returns a new list of stops in optimized order.
    Stops without lat/lng are appended at the end in original order.
    """
    if not stops:
        return stops

    # Separate geocoded and non-geocoded
    geocoded = [s for s in stops if s.get("lat") is not None and s.get("lng") is not None]
    non_geocoded = [s for s in stops if s.get("lat") is None or s.get("lng") is None]

    if len(geocoded) < 2:
        return stops  # nothing to optimize

    # Clamp depot_index
    depot_index = min(depot_index, len(geocoded) - 1)

    unvisited = list(range(len(geocoded)))
    start = depot_index if depot_index < len(geocoded) else 0
    unvisited.remove(start)
    route = [start]

    while unvisited:
        current = route[-1]
        nearest = min(unvisited, key=lambda i: _haversine_km(geocoded[current], geocoded[i]))
        route.append(nearest)
        unvisited.remove(nearest)

    optimized = [geocoded[i] for i in route]
    return optimized + non_geocoded
