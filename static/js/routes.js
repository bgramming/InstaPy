let currentFilter = "";

async function loadRoutes() {
  const container = document.getElementById("routes-container");
  try {
    const routes = await API.routes.list(currentFilter);
    if (!routes.length) {
      container.innerHTML = `
        <div class="text-center text-muted py-5">
          <i class="bi bi-map fs-1 d-block mb-2"></i>
          No routes found. <a href="#" data-bs-toggle="modal" data-bs-target="#newRouteModal">Create one.</a>
        </div>`;
      return;
    }
    container.innerHTML = "";
    routes.forEach(route => container.appendChild(buildRouteCard(route)));
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function buildRouteCard(route) {
  const tmpl = document.getElementById("routeCardTemplate").content.cloneNode(true);
  const card = tmpl.querySelector(".route-card");
  tmpl.querySelector(".route-name").textContent = route.name;
  tmpl.querySelector(".route-meta").textContent = route.notes || "";

  const badge = tmpl.querySelector(".route-status-badge");
  const statusClasses = { pending: "bg-secondary", active: "bg-warning text-dark", completed: "bg-success" };
  badge.className = `badge ${statusClasses[route.status] || "bg-secondary"}`;
  badge.textContent = cap(route.status);

  tmpl.querySelector(".route-stops").textContent = (route.stops || []).length;
  tmpl.querySelector(".route-dist").textContent = route.total_distance_km ? `${route.total_distance_km} km` : "—";
  tmpl.querySelector(".route-optimized-badge").innerHTML = route.optimized
    ? `<i class="bi bi-check-circle-fill text-success me-1"></i>Optimized`
    : `<i class="bi bi-dash-circle text-muted me-1"></i>Not optimized`;

  const openBtn = tmpl.querySelector(".route-open-btn");
  openBtn.href = `/routes/${route._id}`;

  const deleteBtn = tmpl.querySelector(".route-delete-btn");
  deleteBtn.addEventListener("click", async () => {
    if (!confirm("Delete this route?")) return;
    try {
      await API.routes.delete(route._id);
      showToast("Route deleted");
      loadRoutes();
    } catch (e) { showToast(e.message, "error"); }
  });

  return tmpl;
}

// Filter buttons
document.querySelectorAll("[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    loadRoutes();
  });
});

// Load drivers into select
async function loadDriversSelect() {
  try {
    const drivers = await API.drivers.list();
    const select = document.getElementById("driverSelect");
    drivers.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d._id;
      opt.textContent = d.name;
      select.appendChild(opt);
    });
  } catch (_) {}
}

// New route form
document.getElementById("newRouteForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = formToObj(e.target);
  if (!data.driver_id) delete data.driver_id;
  try {
    const route = await API.routes.create(data);
    showToast("Route created");
    bootstrap.Modal.getInstance(document.getElementById("newRouteModal"))?.hide();
    e.target.reset();
    window.location.href = `/routes/${route._id}`;
  } catch (err) { showToast(err.message, "error"); }
});

loadDriversSelect();
loadRoutes();
