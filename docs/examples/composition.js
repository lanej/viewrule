const compositionRoot = document.getElementById("composition-examples");
const compositionPicker = /** @type {HTMLSelectElement} */ (
  document.getElementById("rule-picker")
);
const compositionParams = new URLSearchParams(location.search);
const compositionCopy = {
  "DR-017": [
    "Compare three carrier pickup windows using the same left anchor.",
    "The carrier names share one intentional left anchor.",
    "The middle carrier name drifts 24 CSS pixels from its peers.",
  ],
  "DR-018": [
    "Review three equally related steps in one handoff checklist.",
    "Equal 12-pixel gaps preserve the declared peer rhythm.",
    "An extra 24-pixel gap implies a group boundary that this checklist does not have.",
  ],
  "DR-019": [
    "Use a wider release queue to compare more distinct shipments without losing the first three.",
    "At 1280 pixels, a second column exposes all six readable shipment identities.",
    "At 1280 pixels, the same three shipment cards only stretch across the larger region.",
  ],
  "DR-020": [
    "Inspect three carrier plans with equal declared task priority.",
    "The peers receive comparable card areas without requiring page symmetry.",
    "The middle peer receives 1.8 times its neighbors’ width despite equal priority.",
  ],
};
function renderComposition() {
  const selected = compositionRoot.dataset.fixedRule || compositionPicker.value;
  const id = Object.hasOwn(compositionCopy, selected) ? selected : "DR-017";
  compositionPicker.value = id;
  document.getElementById("composition-task").textContent =
    compositionCopy[id][0];
  const quality = compositionParams.get("quality");
  if (["good", "bad"].includes(quality))
    compositionRoot.dataset.quality = quality;
  compositionRoot.dataset.mode = compositionParams.get("mode") || "queue";
  for (const variant of ["good", "bad"]) {
    const panel = /** @type {HTMLElement} */ (document.getElementById(variant));
    panel.hidden = Boolean(quality && quality !== variant);
    panel.querySelector(".explanation").textContent =
      compositionCopy[id][variant === "good" ? 1 : 2];
    panel
      .querySelector(".sample")
      .replaceChildren(
        /** @type {HTMLTemplateElement} */ (
          document.getElementById(`scene-${id}`)
        ).content.cloneNode(true),
      );
    if (id === "DR-019" && compositionRoot.dataset.mode === "finite") {
      panel
        .querySelectorAll(".queue li:nth-child(n + 4)")
        .forEach((item) => item.remove());
      panel.querySelector(".economy-surface header p").textContent =
        "Compare this complete three-record handoff. Every relevant shipment identity is already visible.";
      panel.querySelector(".economy-surface footer").textContent =
        "Complete three-record queue · all relevant shipments visible";
      panel.querySelector(".explanation").textContent =
        "The complete finite task stays readable at both widths; additional whitespace is allowed.";
    }
  }
  if (!compositionRoot.dataset.fixedRule) {
    const url = new URL(location.href);
    url.searchParams.set("rule", id);
    history.replaceState(null, "", url);
  }
  compositionRoot.dataset.rule = id;
  compositionRoot.dataset.ready = "true";
}
compositionPicker.value = compositionParams.get("rule") || "DR-017";
compositionPicker.addEventListener("change", renderComposition);
renderComposition();
