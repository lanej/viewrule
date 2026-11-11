let paused = false;
let pending = null;
let interval;
const pauseButton = document.getElementById("auto-updates");
const refreshButton = document.getElementById("refresh-now");
const updateLabel = document.getElementById("update-label");
refreshButton.setAttribute("aria-label", "Refresh readings");
function showUpdateState() {
  const label = pauseButton.querySelector(".action-label") || pauseButton;
  label.textContent = paused ? "Resume" : "Pause";
  const accessibleLabel = paused
    ? "Resume automatic refresh"
    : "Pause automatic refresh";
  pauseButton.setAttribute("aria-label", accessibleLabel);
  pauseButton.setAttribute("title", accessibleLabel);
  pauseButton.setAttribute("aria-pressed", String(paused));
  const icon = pauseButton.querySelector(".action-icon path");
  if (icon)
    icon.setAttribute("d", paused ? "M8 5l11 7-11 7Z" : "M8 5v14M16 5v14");
  updateLabel.textContent = paused ? "Paused" : "Updates every 30 seconds";
}
async function refreshStatus(manual = false) {
  if (!manual && (paused || document.hidden || pending)) return;
  const request = { manual };
  pending = request;
  try {
    const response = await fetch(`/status.json${location.search}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Status unavailable");
    const data = await response.json();
    // rationale: Pause or a newer explicit refresh invalidates an automatic
    // response's authority to update the page, even if its request completes.
    if (pending !== request || (!manual && paused)) return;
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
    if (pending === request)
      updateLabel.textContent =
        "Refresh failed; displayed readings may be stale";
  } finally {
    if (pending === request) pending = null;
  }
}
function scheduleAutomaticRefresh() {
  clearInterval(interval);
  interval = setInterval(refreshStatus, 30000);
}
pauseButton.addEventListener("click", () => {
  paused = !paused;
  clearInterval(interval);
  if (paused) {
    if (pending && !pending.manual) pending = null;
  } else {
    pending = null;
    scheduleAutomaticRefresh();
    refreshStatus();
  }
  showUpdateState();
});
refreshButton.addEventListener("click", () => refreshStatus(true));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshStatus();
});
scheduleAutomaticRefresh();
showUpdateState();
refreshStatus();
