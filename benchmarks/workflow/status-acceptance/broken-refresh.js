let paused = false;
let busy = false;
const pauseButton = document.getElementById("auto-updates");
const updateLabel = document.getElementById("update-label");
function showUpdateState() {
  pauseButton.textContent = paused ? "Resume updates" : "Pause updates";
  pauseButton.setAttribute("aria-pressed", String(paused));
  updateLabel.textContent = paused
    ? "Updates paused"
    : "Updates every 30 seconds";
}
async function refreshStatus(manual = false) {
  if (busy || (!manual && (paused || document.hidden))) return;
  busy = true;
  try {
    const response = await fetch(`/status.json${location.search}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Status unavailable");
    const data = await response.json();
    for (const field of [
      "connection",
      "room",
      "target",
      "power",
      "checked",
      "warning",
      "service",
    ])
      document.getElementById(field).textContent = data[field];
    document.getElementById("status-page").dataset.ready = "true";
    showUpdateState();
  } catch {
    updateLabel.textContent = "Refresh failed; displayed readings may be stale";
  } finally {
    busy = false;
  }
}
pauseButton.addEventListener("click", () => {
  paused = !paused;
  showUpdateState();
  if (!paused) refreshStatus();
});
document.getElementById("refresh-now").addEventListener("click", () => {
  paused = false;
  showUpdateState();
  refreshStatus(true);
});
setInterval(refreshStatus, 15000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshStatus();
});
showUpdateState();
refreshStatus();
