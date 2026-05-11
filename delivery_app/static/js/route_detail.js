let currentRoute = null;
let map = null;
let markers = [];
let routePolyline = null;
let dragSrcStop = null;
let activeStopId = null;

// --- Map ---

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: { lat: 39.5, lng: -98.35 },
    mapTypeControl: false,
    fullscreenControl: true,
    streetViewControl: false,
  });
}

// Fallback static map if no API key
if (!window.GOOGLE_MAPS_KEY) {
  document.getElementById("map").innerHTML =
    `<div class="d-flex align-items-center justify-content-center h-100 text-muted flex-column gap-2">
      <i class="bi bi-map fs-1"></i>
      <span>Add a GOOGLE_MAPS_API_KEY to enable the map</span>
    </div>`;
  window.initMap = () => {};
}

function clearMap() {
  markers.forEach(m => m.setMap(null));
  markers = [];
  if (routePolyline) { routePolyline.setMap(null); routePolyline = null; }
}

function drawRoute(stops) {
  if (!map) return;
  clearMap();
  const geocoded = stops.filter(s => s.lat != null && s.lng != null);
  if (!geocoded.length) return;

  const bounds = new google.maps.LatLngBounds();
  geocoded.forEach((stop, i) => {
    const pos = { lat: stop.lat, lng: stop.lng };
    const marker = new google.maps.Marker({
      position: pos,
      map,
      label: { text: String(i + 1), color: "#000", fontWeight: "bold", fontSize: "12px" },
      title: stop.address,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 18,
        fillColor: stop.status === "completed" ? "#198754" : stop.status === "failed" ? "#dc3545" : "#ffc107",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#fff",
      },
    });
    marker.addListener("click", () => openStopDetail(stop));
    markers.push(marker);
    bounds.extend(pos);
  });

  if (geocoded.length > 1) {
    routePolyline = new google.maps.Polyline({
      path: geocoded.map(s => ({ lat: s.lat, lng: s.lng })),
      geodesic: true,
      strokeColor: "#ffc107",
      strokeOpacity: 0.9,
      strokeWeight: 3,
    });
    routePolyline.setMap(map);
  }

  map.fitBounds(bounds);
}

// --- Stop list rendering ---

function renderStops(stops) {
  const list = document.getElementById("stopsList");
  list.innerHTML = "";
  if (!stops.length) {
    list.innerHTML = `<div class="text-center text-muted py-3 small">No stops yet. Add one above.</div>`;
    return;
  }
  stops.forEach((stop, i) => {
    list.appendChild(buildStopCard(stop, i + 1));
  });
  setupDragDrop();
}

function buildStopCard(stop, num) {
  const div = document.createElement("div");
  div.className = `stop-card p-2 d-flex align-items-start gap-2 status-${stop.status}`;
  div.draggable = true;
  div.dataset.stopId = stop.id;

  div.innerHTML = `
    <div class="stop-number flex-shrink-0">${num}</div>
    <div class="flex-grow-1 overflow-hidden">
      <div class="fw-medium text-truncate small">${stop.address}</div>
      ${stop.contact_name ? `<div class="text-muted" style="font-size:.78rem"><i class="bi bi-person me-1"></i>${stop.contact_name}${stop.contact_phone ? " · " + stop.contact_phone : ""}</div>` : ""}
      ${stop.notes ? `<div class="text-muted" style="font-size:.78rem">${stop.notes}</div>` : ""}
    </div>
    <div class="d-flex flex-column gap-1">
      <span class="badge ${stop.status === "completed" ? "bg-success" : stop.status === "failed" ? "bg-danger" : "bg-secondary"} stop-status-badge">${cap(stop.status)}</span>
      <button class="btn btn-sm btn-link p-0 text-muted stop-info-btn" title="Details"><i class="bi bi-info-circle"></i></button>
      <button class="btn btn-sm btn-link p-0 text-danger stop-delete-btn" title="Remove"><i class="bi bi-trash"></i></button>
    </div>`;

  div.querySelector(".stop-info-btn").addEventListener("click", () => openStopDetail(stop));
  div.querySelector(".stop-delete-btn").addEventListener("click", () => deleteStop(stop.id));
  return div;
}

// --- Drag & drop reorder ---

function setupDragDrop() {
  document.querySelectorAll(".stop-card").forEach(card => {
    card.addEventListener("dragstart", e => {
      dragSrcStop = card.dataset.stopId;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", e => { e.preventDefault(); card.classList.add("drag-over"); });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", async e => {
      e.preventDefault();
      card.classList.remove("drag-over");
      if (!dragSrcStop || dragSrcStop === card.dataset.stopId) return;
      const cards = [...document.querySelectorAll(".stop-card")];
      const fromIdx = cards.findIndex(c => c.dataset.stopId === dragSrcStop);
      const toIdx = cards.findIndex(c => c.dataset.stopId === card.dataset.stopId);
      const order = cards.map(c => c.dataset.stopId);
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, dragSrcStop);
      try {
        await API.routes.reorderStops(ROUTE_ID, order);
        await loadRoute();
      } catch (e) { showToast(e.message, "error"); }
    });
  });
}

// --- Stop detail modal ---

function openStopDetail(stop) {
  activeStopId = stop.id;
  document.getElementById("stopDetailBody").innerHTML = `
    <p class="mb-1"><strong>Address:</strong><br>${stop.address}</p>
    ${stop.contact_name ? `<p class="mb-1"><strong>Contact:</strong> ${stop.contact_name}</p>` : ""}
    ${stop.contact_phone ? `<p class="mb-1"><strong>Phone:</strong> ${stop.contact_phone}</p>` : ""}
    ${stop.notes ? `<p class="mb-1"><strong>Notes:</strong> ${stop.notes}</p>` : ""}
    <p class="mb-0"><strong>Status:</strong> ${statusBadge(stop.status)}</p>`;
  new bootstrap.Modal(document.getElementById("stopDetailModal")).show();
}

document.getElementById("stopMarkComplete")?.addEventListener("click", async () => {
  if (!activeStopId) return;
  try {
    await API.routes.updateStop(ROUTE_ID, activeStopId, { status: "completed" });
    bootstrap.Modal.getInstance(document.getElementById("stopDetailModal"))?.hide();
    showToast("Stop marked complete", "success");
    await loadRoute();
  } catch (e) { showToast(e.message, "error"); }
});

document.getElementById("stopMarkFailed")?.addEventListener("click", async () => {
  if (!activeStopId) return;
  try {
    await API.routes.updateStop(ROUTE_ID, activeStopId, { status: "failed" });
    bootstrap.Modal.getInstance(document.getElementById("stopDetailModal"))?.hide();
    showToast("Stop marked failed", "warning");
    await loadRoute();
  } catch (e) { showToast(e.message, "error"); }
});

// --- Add stop ---

document.getElementById("addStopForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  const data = formToObj(e.target);
  try {
    // Try geocoding if API key present
    if (window.GOOGLE_MAPS_KEY) {
      try {
        const coords = await API.optimize.geocode(data.address);
        data.lat = coords.lat;
        data.lng = coords.lng;
      } catch (_) {}
    }
    await API.routes.addStop(ROUTE_ID, data);
    showToast("Stop added");
    e.target.reset();
    await loadRoute();
  } catch (err) { showToast(err.message, "error"); }
  finally { btn.disabled = false; }
});

// --- Delete stop ---

async function deleteStop(stopId) {
  if (!confirm("Remove this stop?")) return;
  try {
    await API.routes.deleteStop(ROUTE_ID, stopId);
    showToast("Stop removed");
    await loadRoute();
  } catch (e) { showToast(e.message, "error"); }
}

// --- Optimize ---

document.getElementById("btnOptimize")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnOptimize");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Optimizing…`;
  try {
    const result = await API.optimize.run(ROUTE_ID, 0);
    showToast(`Optimized! ${result.total_distance_km} km total`);
    await loadRoute();
  } catch (e) { showToast(e.message, "error"); }
  finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-magic me-1"></i>Optimize`;
  }
});

// --- Edit route ---

document.getElementById("btnEditRoute")?.addEventListener("click", async () => {
  const drivers = await API.drivers.list().catch(() => []);
  const sel = document.getElementById("editDriverSelect");
  sel.innerHTML = `<option value="">— Unassigned —</option>`;
  drivers.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d._id;
    opt.textContent = d.name;
    if (currentRoute.driver_id === d._id) opt.selected = true;
    sel.appendChild(opt);
  });
  document.querySelector("#editRouteForm [name=name]").value = currentRoute.name || "";
  document.querySelector("#editRouteForm [name=notes]").value = currentRoute.notes || "";
  new bootstrap.Modal(document.getElementById("editRouteModal")).show();
});

document.getElementById("editRouteForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = formToObj(e.target);
  if (!data.driver_id) delete data.driver_id;
  try {
    await API.routes.update(ROUTE_ID, data);
    showToast("Route updated");
    bootstrap.Modal.getInstance(document.getElementById("editRouteModal"))?.hide();
    await loadRoute();
  } catch (e) { showToast(e.message, "error"); }
});

// --- Status change ---

document.querySelectorAll("[data-status]").forEach(el => {
  el.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await API.routes.update(ROUTE_ID, { status: el.dataset.status });
      showToast("Status updated");
      await loadRoute();
    } catch (e) { showToast(e.message, "error"); }
  });
});

// --- Load route ---

async function loadRoute() {
  try {
    const route = await API.routes.get(ROUTE_ID);
    currentRoute = route;
    const stops = route.stops || [];

    document.getElementById("routeNameHeader").textContent = route.name;
    document.getElementById("routeActions").style.removeProperty("display");

    const statusBadgeEl = document.getElementById("routeStatusBadge");
    const statusColors = { pending: "bg-secondary", active: "bg-warning text-dark", completed: "bg-success" };
    statusBadgeEl.className = `badge ${statusColors[route.status] || "bg-secondary"}`;
    statusBadgeEl.textContent = cap(route.status);

    document.getElementById("routeDistance").textContent =
      route.total_distance_km ? `${route.total_distance_km} km` : "—";
    document.getElementById("routeStopCount").textContent = stops.length;
    document.getElementById("routeOptimizedLabel").innerHTML = route.optimized
      ? `<i class="bi bi-check-circle-fill text-success me-1"></i>Optimized`
      : `<i class="bi bi-dash-circle text-muted me-1"></i>Not optimized`;

    renderStops(stops);
    drawRoute(stops);
  } catch (e) {
    showToast(e.message, "error");
  }
}

// Init
if (typeof GOOGLE_MAPS_KEY === "undefined" || !GOOGLE_MAPS_KEY) {
  window.initMap = function() {};
}

loadRoute();
