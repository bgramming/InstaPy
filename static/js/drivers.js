async function loadDrivers() {
  const container = document.getElementById("drivers-container");
  try {
    const drivers = await API.drivers.list();
    if (!drivers.length) {
      container.innerHTML = `
        <div class="text-center text-muted py-5">
          <i class="bi bi-people fs-1 d-block mb-2"></i>
          No drivers yet. <a href="#" data-bs-toggle="modal" data-bs-target="#newDriverModal">Add one.</a>
        </div>`;
      return;
    }
    const row = document.createElement("div");
    row.className = "row g-3";
    for (const driver of drivers) {
      const card = await buildDriverCard(driver);
      row.appendChild(card);
    }
    container.innerHTML = "";
    container.appendChild(row);
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function buildDriverCard(driver) {
  const tmpl = document.getElementById("driverCardTemplate").content.cloneNode(true);
  tmpl.querySelector(".driver-name").textContent = driver.name;
  tmpl.querySelector(".driver-vehicle").textContent =
    [driver.vehicle, driver.vehicle_plate].filter(Boolean).join(" · ") || "No vehicle";
  if (driver.phone) tmpl.querySelector(".driver-phone").innerHTML =
    `<i class="bi bi-telephone me-1"></i>${driver.phone}`;
  if (driver.email) tmpl.querySelector(".driver-email").innerHTML =
    `<i class="bi bi-envelope me-1"></i>${driver.email}`;
  if (driver.vehicle_plate) tmpl.querySelector(".driver-plate").innerHTML =
    `<i class="bi bi-card-text me-1"></i>${driver.vehicle_plate}`;

  try {
    const routes = await API.drivers.routes(driver._id);
    tmpl.querySelector(".driver-routes").textContent = routes.length;
  } catch (_) { tmpl.querySelector(".driver-routes").textContent = "—"; }

  tmpl.querySelector(".driver-edit-btn").addEventListener("click", () => openEditDriver(driver));

  return tmpl;
}

function openEditDriver(driver) {
  const form = document.getElementById("editDriverForm");
  form.querySelector("[name=driver_id]").value = driver._id;
  form.querySelector("[name=name]").value = driver.name || "";
  form.querySelector("[name=phone]").value = driver.phone || "";
  form.querySelector("[name=email]").value = driver.email || "";
  form.querySelector("[name=vehicle]").value = driver.vehicle || "";
  form.querySelector("[name=vehicle_plate]").value = driver.vehicle_plate || "";
  form.querySelector("[name=notes]").value = driver.notes || "";
  new bootstrap.Modal(document.getElementById("editDriverModal")).show();
}

// New driver
document.getElementById("newDriverForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = formToObj(e.target);
  try {
    await API.drivers.create(data);
    showToast("Driver added");
    bootstrap.Modal.getInstance(document.getElementById("newDriverModal"))?.hide();
    e.target.reset();
    loadDrivers();
  } catch (err) { showToast(err.message, "error"); }
});

// Edit driver
document.getElementById("editDriverForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = formToObj(e.target);
  const id = data.driver_id;
  delete data.driver_id;
  try {
    await API.drivers.update(id, data);
    showToast("Driver updated");
    bootstrap.Modal.getInstance(document.getElementById("editDriverModal"))?.hide();
    loadDrivers();
  } catch (err) { showToast(err.message, "error"); }
});

// Deactivate
document.getElementById("deactivateDriverBtn")?.addEventListener("click", async () => {
  const id = document.querySelector("#editDriverForm [name=driver_id]").value;
  if (!id || !confirm("Deactivate this driver?")) return;
  try {
    await API.drivers.delete(id);
    showToast("Driver deactivated", "warning");
    bootstrap.Modal.getInstance(document.getElementById("editDriverModal"))?.hide();
    loadDrivers();
  } catch (e) { showToast(e.message, "error"); }
});

loadDrivers();
