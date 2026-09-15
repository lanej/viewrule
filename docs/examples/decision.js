// One shared invented dataset and template; only hierarchy and treatment differ.
const requested = new URLSearchParams(location.search).get("quality");
const qualities = ["good", "bad"].filter(
  (quality) => !["good", "bad"].includes(requested) || requested === quality,
);
const template = /** @type {HTMLTemplateElement} */ (
  document.querySelector("#surface-template")
);
for (const quality of qualities) {
  const fragment = template.content.cloneNode(true);
  const scene = /** @type {DocumentFragment} */ (fragment);
  const version = scene.querySelector(".version");
  version.classList.add(quality);
  version.id = quality;
  scene.querySelector(".version-title").textContent =
    quality === "good"
      ? "Good · one compact decision surface"
      : "Bad · repeated summary and dispersed evidence";
  if (quality === "bad") {
    const repeated = scene.querySelector(".repeated-summary");
    repeated.removeAttribute("hidden");
    for (const metric of scene.querySelectorAll("summary .metric"))
      repeated.append(metric.cloneNode(true));
    scene
      .querySelector(".expanded")
      .append(scene.querySelector(".recommendation"));
  }
  scene.querySelector("button").addEventListener("click", () => {
    version.querySelector(".action-status").textContent =
      "Sample review prepared for Nodes A–F. This local example stores no changes.";
  });
  document.querySelector("#examples").append(scene);
}
document.querySelector("#decision-examples").setAttribute("data-ready", "");
