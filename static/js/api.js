// Lightweight API helper
const API = {
  async _fetch(method, url, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  },
  get: (url) => API._fetch("GET", url),
  post: (url, body) => API._fetch("POST", url, body),
  put: (url, body) => API._fetch("PUT", url, body),
  delete: (url) => API._fetch("DELETE", url),

  routes: {
    list: (status) => API.get(`/api/routes/${status ? "?status=" + status : ""}`),
    get: (id) => API.get(`/api/routes/${id}`),
    create: (data) => API.post("/api/routes/", data),
    update: (id, data) => API.put(`/api/routes/${id}`, data),
    delete: (id) => API.delete(`/api/routes/${id}`),
    addStop: (routeId, data) => API.post(`/api/routes/${routeId}/stops`, data),
    updateStop: (routeId, stopId, data) => API.put(`/api/routes/${routeId}/stops/${stopId}`, data),
    deleteStop: (routeId, stopId) => API.delete(`/api/routes/${routeId}/stops/${stopId}`),
    reorderStops: (routeId, order) => API.put(`/api/routes/${routeId}/stops/reorder`, { order }),
  },
  drivers: {
    list: () => API.get("/api/drivers/"),
    create: (data) => API.post("/api/drivers/", data),
    update: (id, data) => API.put(`/api/drivers/${id}`, data),
    delete: (id) => API.delete(`/api/drivers/${id}`),
    routes: (id) => API.get(`/api/drivers/${id}/routes`),
  },
  optimize: {
    run: (routeId, depotIndex = 0) => API.post(`/api/optimize/${routeId}`, { depot_index: depotIndex }),
    geocode: (address) => API.post("/api/optimize/geocode", { address }),
  },
};
