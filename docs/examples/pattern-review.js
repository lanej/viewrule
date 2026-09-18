// Shared synthetic data and DOM. Stages change ownership/framing, not the facts.
const descriptions = {
  before:
    "Before · rejected: stacked context, repeated framing, oversized cards.",
  components:
    "Component pass only · units pass; the assembled evidence panel still fails.",
  composition:
    "Revised composition · shared context, aligned evidence, compact charts.",
  hidden:
    "Negative control · rejected: compact, but required evidence is hidden.",
};
const requested = new URLSearchParams(location.search).get("stage");
const stage = Object.hasOwn(descriptions, requested)
  ? requested
  : "composition";
const template = /** @type {HTMLTemplateElement} */ (
  document.querySelector("#pattern-template")
);
document.querySelector("#surface").append(template.content.cloneNode(true));
const surface = document.querySelector(".pattern-surface");
surface.classList.add(stage);
document.querySelector(".stage-description").textContent = descriptions[stage];
document
  .querySelector(`nav a[href="?stage=${stage}"]`)
  .setAttribute("aria-current", "page");
if (stage === "before") {
  for (const detail of surface.querySelectorAll("details")) detail.open = true;
}
if (["composition", "hidden"].includes(stage)) {
  // Shared context belongs to the parent; remove duplicate framing from the DOM.
  surface.querySelector(".headline-copy").remove();
  surface.querySelector(".repeated-frame").remove();
  const identity = surface.querySelector(".identity-line");
  const action = surface.querySelector(".review-action");
  identity.insertBefore(surface.querySelector(".confidence"), action);
  identity.insertBefore(surface.querySelector(".direction"), action);
  identity.insertBefore(surface.querySelector(".observation-window"), action);
  identity.append(surface.querySelector(".action-status"));
  surface.querySelector(".status-line").remove();

  const contextTemplate = /** @type {HTMLTemplateElement} */ (
    document.querySelector("#context-template")
  );
  surface.append(contextTemplate.content.cloneNode(true));
  for (const context of surface.querySelectorAll("[data-context]")) {
    context.querySelector(".context-role").remove();
    context.setAttribute("aria-describedby", "context-role");
    surface.querySelector(".context-rows").append(context);
  }
  // Inline processing values share the same row as the other context summaries.
  surface.querySelector(".processing-context br").replaceWith(" · ");
  surface.querySelector(".rate-comparison").removeAttribute("hidden");
  surface.querySelector(".weight-heading").removeAttribute("hidden");
  for (const weight of surface.querySelectorAll(".weight")) {
    weight.setAttribute("aria-label", weight.textContent);
    weight.textContent = weight.textContent.replace("Ranking weight: ", "");
  }
  surface.querySelector('[data-factor="volume"] h4').textContent = "Volume";
  for (const summary of surface.querySelectorAll("summary")) {
    summary.setAttribute("aria-label", summary.textContent);
    summary.textContent = "Details";
  }
}
if (stage === "hidden") {
  surface
    .querySelector("[data-factor=rate] details")
    .append(surface.querySelector(".denominator"));
  surface
    .querySelector(".trend-detail")
    .append(
      surface.querySelector(".trend-value"),
      surface.querySelector(".trend-comparison"),
    );
}

const samples = [
  21.6, 24.2, 22.8, 27.4, 25.1, 29.6, 28.2, 31.4, 29.2, 27.6, 26.1, 24.8,
];
const cycles = "ABCDEFGHIJKL";
function renderHistory(count) {
  const values = samples.slice(-count);
  const points = values
    .map((value, i) => `${(i * 1000) / (values.length - 1)},${200 - value * 4}`)
    .join(" ");
  surface.querySelector(".chart-line").setAttribute("points", points);
  surface
    .querySelector(".chart-area")
    .setAttribute("points", `0,200 ${points} 1000,200`);
  surface.querySelector(".chart-window").textContent =
    `History: cycles ${cycles[samples.length - count]}–L`;
  surface
    .querySelector("svg")
    .setAttribute(
      "aria-label",
      `Synthetic review rates, cycles ${cycles[samples.length - count]}–L: ${values.join(", ")} percent. Scale 0 to 50 percent.`,
    );
  for (const button of surface.querySelectorAll("[data-cycles]")) {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.getAttribute("data-cycles")) === count),
    );
  }
}
for (const button of surface.querySelectorAll("[data-cycles]")) {
  button.addEventListener("click", () =>
    renderHistory(Number(button.getAttribute("data-cycles"))),
  );
}
surface.querySelector(".review-action").addEventListener("click", () => {
  surface.querySelector(".action-status").textContent =
    "Q7 queued locally · no external changes";
});
renderHistory(12);
document.querySelector("#pattern-review").setAttribute("data-ready", stage);
export {};
