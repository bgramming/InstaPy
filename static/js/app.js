// Global utilities

// Sidebar toggle
document.getElementById("sidebarToggle")?.addEventListener("click", () => {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("collapsed");
});

// Toast notifications
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const colors = { success: "bg-success", error: "bg-danger", warning: "bg-warning text-dark", info: "bg-info text-dark" };
  const el = document.createElement("div");
  el.className = `toast show toast-msg text-white ${colors[type] || "bg-secondary"} mb-2`;
  el.innerHTML = `
    <div class="toast-body d-flex justify-content-between align-items-center">
      <span>${message}</span>
      <button type="button" class="btn-close btn-close-white ms-2" onclick="this.closest('.toast').remove()"></button>
    </div>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Status badge helper
function statusBadge(status) {
  const map = {
    pending: "bg-secondary",
    active: "bg-warning text-dark",
    completed: "bg-success",
    failed: "bg-danger",
  };
  return `<span class="badge ${map[status] || "bg-secondary"}">${cap(status)}</span>`;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

// Form data to object
function formToObj(form) {
  return Object.fromEntries(new FormData(form).entries());
}
