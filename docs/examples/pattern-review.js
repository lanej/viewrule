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
const parameters = new URLSearchParams(location.search);
const patternCase = parameters.get("case");
if (["toolbar", "whitespace", "changed-task", "scopes"].includes(patternCase)) {
  renderComparison(
    patternCase,
    parameters.get("quality") === "bad" ? "bad" : "good",
  );
} else {
  const requested = parameters.get("stage");
  const stage = Object.hasOwn(descriptions, requested)
    ? requested
    : "composition";
  const template = /** @type {HTMLTemplateElement} */ (
    document.querySelector("#pattern-template")
  );
  document.querySelector("#surface").append(template.content.cloneNode(true));
  const surface = document.querySelector(".pattern-surface");
  surface.classList.add(stage);
  document.querySelector(".stage-description").textContent =
    descriptions[stage];
  document
    .querySelector(`nav a[href="?stage=${stage}"]`)
    .setAttribute("aria-current", "page");
  if (stage === "before") {
    for (const detail of surface.querySelectorAll("details"))
      detail.open = true;
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
      weight.setAttribute("aria-describedby", "weight-heading");
      weight.textContent = weight.textContent.replace("Ranking weight: ", "");
      const value = document.createElement("span");
      value.className = "weight-value";
      value.textContent = weight.textContent;
      const track = document.createElement("span");
      track.className = "weight-track";
      track.setAttribute("aria-hidden", "true");
      const bar = document.createElement("span");
      bar.className = "weight-bar";
      bar.style.width = weight.textContent;
      track.append(bar);
      weight.replaceChildren(value, track);
    }
    surface.querySelector('[data-factor="volume"] h4').textContent = "Volume";
    for (const summary of surface.querySelectorAll("summary")) {
      summary.setAttribute(
        "aria-label",
        `Details: ${summary.textContent.trim()}`,
      );
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
      .map(
        (value, i) => `${(i * 1000) / (values.length - 1)},${200 - value * 4}`,
      )
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
}

function renderComparison(patternCase, quality) {
  const data = [
    {
      id: "Q7",
      source: "catalog",
      name: "Catalog",
      count: 231,
      total: 875,
      eligible: true,
      trend: "−8.6% vs cycles E–H",
      window: "4",
    },
    {
      id: "Q8",
      source: "catalog",
      name: "Regional catalog with a long descriptive name",
      count: 90,
      total: 1000,
      eligible: false,
      trend: "+2.4% vs cycles E–H",
      window: "8",
    },
    {
      id: "Q9",
      source: "inventory",
      name: "Inventory",
      count: 15,
      total: 500,
      eligible: true,
      trend: "−1.2% vs cycles E–H",
      window: "4",
    },
  ];
  const template = /** @type {HTMLTemplateElement} */ (
    document.querySelector("#comparison-template")
  );
  document.querySelector("#surface").append(template.content.cloneNode(true));
  const surface = document.querySelector(".comparison-surface");
  surface.setAttribute("data-case", patternCase);
  surface.setAttribute("data-quality", quality);
  document.querySelector(".stage-description").textContent =
    `${patternCase} · ${quality === "good" ? "accepted fixture" : "controlled rejection"}`;
  const navigation = document.createElement("nav");
  navigation.setAttribute("aria-label", "Pattern variants");
  for (const variant of ["good", "bad"]) {
    const link = document.createElement("a");
    link.href = `?case=${patternCase}&quality=${variant}`;
    link.textContent = variant === "good" ? "Accepted" : "Rejected";
    if (variant === quality) link.setAttribute("aria-current", "page");
    navigation.append(link);
  }
  document.querySelector(".example-header").append(navigation);
  for (const item of data) {
    const rowTemplate = /** @type {HTMLTemplateElement} */ (
      document.querySelector("#decision-row-template")
    );
    const row = /** @type {HTMLElement} */ (
      rowTemplate.content.firstElementChild.cloneNode(true)
    );
    row.dataset.key = item.id;
    row.dataset.source = item.source;
    row.querySelector(".queue-identity").textContent = item.id;
    row.querySelector(".queue-source").textContent = item.name;
    row.querySelector(".queue-denominator").textContent =
      `${item.count} of ${item.total} classified records`;
    row.querySelector(".queue-eligibility").textContent = item.eligible
      ? "Eligible for review"
      : "Blocked: source authorization required";
    const action = /** @type {HTMLButtonElement} */ (
      row.querySelector(".queue-action")
    );
    action.textContent = `Queue ${item.id} for review`;
    action.disabled = !item.eligible;
    action.addEventListener("click", () => {
      row.querySelector(".queue-action-status").textContent =
        `${item.id} queued locally`;
    });
    const window = /** @type {HTMLSelectElement} */ (
      row.querySelector(".local-window select")
    );
    window.value = item.window;
    window.setAttribute("aria-label", `${item.id} history window`);
    row.querySelector("summary").textContent = `Details for ${item.id}`;
    row.querySelector(".queue-trend").textContent = item.trend;
    if (patternCase === "changed-task" && quality === "good")
      row
        .querySelector(".primary-trend")
        .append(row.querySelector(".queue-trend"));
    surface.querySelector(".decision-rows").append(row);
  }
  // Each rejected variant is one mutation of the same complete baseline.
  if (patternCase === "toolbar" && quality === "bad")
    surface.querySelector(".active-scope").setAttribute("hidden", "");
  if (patternCase === "whitespace" && quality === "bad")
    surface.classList.add("stretched");
  if (patternCase === "scopes" && quality === "bad") {
    // The same three controls now falsely appear to govern the entire queue.
    for (const control of surface.querySelectorAll(".local-window"))
      surface.querySelector(".comparison-toolbar").append(control);
  }
  const filter = /** @type {HTMLSelectElement} */ (
    surface.querySelector(".source-filter")
  );
  filter.addEventListener("change", () => {
    let count = 0;
    for (const row of surface.querySelectorAll(".decision-row")) {
      const visible =
        filter.value === "all" ||
        row.getAttribute("data-source") === filter.value;
      row.toggleAttribute("hidden", !visible);
      count += Number(visible);
    }
    surface.querySelector(".active-scope").textContent =
      `Showing ${filter.value === "all" ? "all sources" : filter.selectedOptions[0].textContent} · ${count} groups`;
  });
  document.querySelector(".example-notes").innerHTML = "";
  const note = document.createElement("p");
  note.textContent =
    "The same three groups, facts, type and actions appear in both variants. Empty space is allowed. Task revision 1 treats trend as supporting detail; revision 2 requires it before every decision. Independent history windows belong to their group. These are calibration expectations, not human approval or agent efficacy evidence.";
  document.querySelector(".example-notes").append(note);
  document
    .querySelector("#pattern-review")
    .setAttribute("data-ready", `${patternCase}-${quality}`);
}
export {};
