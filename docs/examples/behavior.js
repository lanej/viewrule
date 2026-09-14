// Deliberately paired teaching fixtures, not production carrier operations.
// The catalog describes judgment separately from observable engine checks.
const root = document.getElementById("behavior-examples");
const picker = /** @type {HTMLSelectElement} */ (
  document.getElementById("rule-picker")
);
const statePicker = /** @type {HTMLSelectElement} */ (
  document.getElementById("state-picker")
);
const largerText = /** @type {HTMLInputElement} */ (
  document.getElementById("large-text")
);
const find = (element, role) => element.querySelector(`[data-role="${role}"]`);

async function start() {
  const response = await fetch(
    new URL("behavior-catalog.json", import.meta.url),
  );
  if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
  const catalog = await response.json();
  for (const rule of catalog.rules) {
    const option = document.createElement("option");
    option.value = rule.id;
    option.textContent = `${rule.id} · ${rule.title}`;
    picker.append(option);
  }
  const requested =
    root.dataset.fixedRule || new URL(location.href).searchParams.get("rule");
  picker.value = catalog.rules.some((rule) => rule.id === requested)
    ? requested
    : "DR-009";

  function render() {
    const rule = catalog.rules.find((entry) => entry.id === picker.value);
    root.removeAttribute("data-ready");
    root.dataset.rule = rule.id;
    document.querySelector("#rule-heading").textContent =
      `${rule.id} — ${rule.title}`;
    document.querySelector("#task").textContent = rule.task;
    document.querySelector("#verification").textContent = rule.verification;
    document.querySelector("#alternatives").textContent =
      rule.alternatives.join(" ");
    document.querySelector("#exception").textContent = rule.exception;
    document.getElementById("state-control").hidden = rule.id !== "DR-009";
    document.getElementById("text-control").hidden = rule.id !== "DR-015";
    const policyLink = /** @type {HTMLAnchorElement} */ (
      document.getElementById("policy-link")
    );
    // Retain the source-checkout or deployment-rewritten policy URL.
    if (policyLink) {
      policyLink.hash = rule.policyAnchor;
      policyLink.textContent = `Read ${rule.id} in the design policy`;
    }
    const sources = document.querySelector("#sources");
    sources.replaceChildren();
    for (const source of rule.sources) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source;
      link.textContent = source.replace(/^https:\/\//, "");
      item.append(link);
      sources.append(item);
    }
    for (const quality of ["good", "bad"]) {
      const panel = document.querySelector(`#${quality}`);
      panel.querySelector(".explanation").textContent = rule[quality];
      const sample = /** @type {HTMLElement} */ (
        panel.querySelector(".sample")
      );
      sample.replaceChildren(
        /** @type {HTMLTemplateElement} */ (
          document.querySelector(`#scene-${rule.id}`)
        ).content.cloneNode(true),
      );
      sample.dataset.enlarged = String(
        rule.id === "DR-015" && largerText.checked,
      );
      configure(sample, rule.id, quality === "good");
    }
    const url = new URL(location.href);
    url.searchParams.set("rule", rule.id);
    if (!root.dataset.fixedRule) history.replaceState(null, "", url);
    root.dataset.ready = "true";
  }

  function configure(sample, id, good) {
    if (id === "DR-009") {
      const state = statePicker.value;
      const count = find(sample, "count");
      const status = find(sample, "status");
      const copy = {
        failed:
          "Refresh failed — showing a stale snapshot. Retry is available.",
        loading: "Loading shipment data — no result yet.",
        loaded: "Shipment snapshot loaded.",
        empty: "No shipments in this observed snapshot.",
        filtered: "No shipments match the Seattle filter.",
        submitting: "Submitting publication — not yet queued.",
        queued: "Publication queued — not yet completed.",
        completed: "Publication completed.",
      };
      count.textContent = ["empty", "filtered"].includes(state)
        ? "0"
        : state === "loading"
          ? "—"
          : "12";
      status.textContent = copy[state];
      find(sample, "as-of").textContent =
        `Snapshot as of ${state === "loaded" ? "09:05" : "09:00"}`;
      find(sample, "as-of").hidden = state === "loading";
      find(sample, "retry").hidden = state !== "failed";
      if (!good) {
        if (["failed", "loading", "filtered", "empty"].includes(state))
          count.textContent = "0";
        status.textContent = ["submitting", "queued", "completed"].includes(
          state,
        )
          ? "Published"
          : "Up to date";
        // No false label can turn this into a valid snapshot. The missing as-of
        // and refresh-at context is the narrow difference the native rule checks.
        find(sample, "as-of").hidden = true;
        find(sample, "refresh-at").hidden = true;
        find(sample, "retry").hidden = true;
      }
      find(sample, "retry").onclick = () => {
        statePicker.value = "loaded";
        render();
        statePicker.focus();
      };
    }
    if (id === "DR-010") {
      const dialog = find(sample, "dialog");
      const open = find(sample, "open");
      open.onclick = () => dialog.showModal();
      find(sample, "close").onclick = () => dialog.close();
      dialog.addEventListener("close", () => {
        if (!good) {
          find(sample, "filter").value = "";
          find(sample, "selected").textContent = "EP 1043";
          find(sample, "filter").focus();
        }
      });
    }
    if (id === "DR-011") {
      const dialog = find(sample, "dialog");
      const apply = () => {
        find(sample, "result").textContent =
          "Published for 12 selected lanes, effective September 15, 2026.";
      };
      if (!good) {
        find(sample, "scope").hidden = true;
        find(sample, "publish").textContent = "Apply";
      }
      find(sample, "publish").onclick = () =>
        good ? dialog.showModal() : apply();
      find(sample, "cancel").onclick = () => dialog.close();
      find(sample, "confirm").onclick = () => {
        apply();
        dialog.close();
      };
    }
    if (id === "DR-012") {
      const input = find(sample, "proposal");
      const error = find(sample, "error");
      const dialog = find(sample, "dialog");
      error.id = `proposal-error-${good ? "good" : "bad"}`;
      input.setAttribute("aria-describedby", error.id);
      let approved = 5;
      let previous = 5;
      let proposed = null;
      const commit = () => {
        previous = approved;
        approved = proposed;
        find(sample, "approved").textContent = `${approved}%`;
        find(sample, "result").textContent =
          `Applied ${approved}% reduction to the 12 selected lanes.`;
        find(sample, "undo").hidden = !good;
      };
      find(sample, "form").onsubmit = (event) => {
        event.preventDefault();
        const value = Number(input.value);
        if (
          !input.value.trim() ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > 6
        ) {
          error.hidden = false;
          error.textContent = good
            ? "Enter a reduction from 0% through 6%. Your proposal has been retained."
            : "Something went wrong.";
          input.setAttribute("aria-invalid", "true");
          if (!good) input.value = "";
          return;
        }
        error.hidden = true;
        input.removeAttribute("aria-invalid");
        proposed = value;
        if (good) {
          find(sample, "review").textContent =
            `Change the approved reduction from ${approved}% to ${proposed}% for 12 selected lanes.`;
          dialog.showModal();
        } else commit();
      };
      find(sample, "cancel").onclick = () => dialog.close();
      find(sample, "confirm").onclick = () => {
        commit();
        dialog.close();
      };
      find(sample, "undo").onclick = () => {
        approved = previous;
        find(sample, "approved").textContent = `${approved}%`;
        find(sample, "result").textContent =
          `Restored the approved reduction to ${approved}%.`;
        find(sample, "undo").hidden = true;
      };
    }
    if (id === "DR-013") {
      find(sample, "respond").onclick = () => {
        find(sample, "result").textContent =
          "EP 1042, EP 1047, and EP 1051 are awaiting address corrections.";
      };
    }
    if (id === "DR-014") {
      let trigger = find(sample, "trigger");
      const evidence = find(sample, "evidence");
      evidence.id = `dwell-evidence-${good ? "good" : "bad"}`;
      if (!good) {
        const span = document.createElement("span");
        span.dataset.role = "trigger";
        span.className = "pointer-only";
        span.textContent = trigger.textContent;
        trigger.replaceWith(span);
        trigger = span;
      } else trigger.setAttribute("aria-controls", evidence.id);
      const setOpen = (open) => {
        evidence.hidden = !open;
        if (good) trigger.setAttribute("aria-expanded", String(open));
      };
      trigger.onclick = () => setOpen(evidence.hidden);
      if (!good) {
        trigger.onmouseenter = () => setOpen(true);
        trigger.onmouseleave = () => setOpen(false);
      } else {
        sample.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            setOpen(false);
            trigger.focus();
          }
        });
      }
    }
  }
  picker.addEventListener("change", render);
  statePicker.addEventListener("change", render);
  largerText.addEventListener("change", render);
  document.querySelector("#reset").addEventListener("click", () => {
    statePicker.value = "failed";
    largerText.checked = false;
    render();
  });
  render();
}
start().catch(() => {
  document.getElementById("load-error").hidden = false;
});
