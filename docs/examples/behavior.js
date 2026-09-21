import { configurePriority } from "./priority-scene.js";

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

  // Snapshot and request state are separate: a request cannot manufacture data.
  const initialSnapshot = { count: 12, asOf: "09:00" };
  const recoveredSnapshot = { count: 18, asOf: "09:05" };
  /** @type {{ count: number; asOf: string } | null} */
  let snapshot = initialSnapshot;
  let attempt = "09:05";
  let request = 0;
  /** @type {((value: typeof snapshot) => void) | null} */
  let resolveResponse = null;
  const pauseResponse = /** @type {HTMLInputElement} */ (
    document.getElementById("pause-response")
  );
  const responseControls = document.getElementById("response-controls");

  function paintShipment(sample, good) {
    const state = statePicker.value;
    const busy = ["refreshing", "retrying"].includes(state);
    const count = find(sample, "count");
    const status = find(sample, "status");
    const asOf = find(sample, "as-of");
    const refreshAt = find(sample, "refresh-at");
    const retry = find(sample, "retry");
    const copy = {
      failed: "stale",
      loading: "Loading — no result yet",
      refreshing: "Refreshing",
      retrying: "stale · retrying",
      loaded: "Loaded",
      empty: "Observed empty",
      filtered: "Filtered out",
      submitting: "Submitting — not yet queued",
      queued: "Queued — not yet completed",
      completed: "Completed",
    };
    count.textContent =
      state === "filtered" ? "0" : String(snapshot?.count ?? "—");
    status.textContent = copy[state];
    status.id = `shipment-status-${good ? "good" : "bad"}`;
    asOf.id = `shipment-as-of-${good ? "good" : "bad"}`;
    count.setAttribute(
      "aria-describedby",
      good && snapshot ? `${status.id} ${asOf.id}` : status.id,
    );
    asOf.textContent = snapshot ? `Data as of ${snapshot.asOf}` : "";
    asOf.hidden = !snapshot;
    refreshAt.hidden = !snapshot;
    refreshAt.textContent =
      state === "failed"
        ? `Refresh failed at ${attempt}`
        : busy
          ? `Refresh requested at ${attempt}`
          : `Response received at ${attempt}`;
    retry.hidden =
      !snapshot || ["submitting", "queued", "completed"].includes(state);
    retry.textContent = busy
      ? state === "retrying"
        ? "Retrying…"
        : "Refreshing…"
      : state === "failed"
        ? "Retry"
        : "Refresh";
    // Keep the invoking button focused while preventing duplicate requests.
    retry.setAttribute("aria-disabled", String(busy));
    sample.dataset.state = state;
    find(sample, "count")
      .closest(".metric")
      .setAttribute("aria-busy", String(busy));
    if (!good && ["failed", "retrying"].includes(state)) {
      // Controlled counterexample: preserve the same polished component,
      // failure evidence, and recovery action. Only the state interpretation is
      // wrong: a failed refresh is promoted to a current zero observation.
      count.textContent = "0";
      status.textContent =
        state === "retrying" ? "current · retrying" : "current";
      asOf.textContent = `Data as of ${attempt}`;
    }
    retry.onclick = async () => {
      if (["refreshing", "retrying"].includes(statePicker.value)) return;
      const currentRequest = ++request;
      attempt = "09:06";
      statePicker.value =
        statePicker.value === "failed" ? "retrying" : "refreshing";
      paintShipments();
      // The fixture can resolve immediately or be held for deterministic review.
      // Reset or selecting another fixture invalidates an outstanding response.
      /** @type {typeof snapshot} */
      const result = pauseResponse.checked
        ? await new Promise((resolve) => {
            resolveResponse = resolve;
            responseControls.hidden = false;
          })
        : await Promise.resolve(recoveredSnapshot);
      if (currentRequest !== request) return;
      resolveResponse = null;
      responseControls.hidden = true;
      if (result) snapshot = result;
      statePicker.value = result ? "loaded" : "failed";
      paintShipments();
    };
  }

  function paintShipments() {
    for (const quality of ["good", "bad"])
      paintShipment(
        document.querySelector(`#${quality} .sample`),
        quality === "good",
      );
    root.dataset.shipmentState = statePicker.value;
  }

  function settleResponse(result) {
    if (!resolveResponse) return;
    resolveResponse(result);
    // A fixture-response control is about to disappear; return to the local action.
    find(document.querySelector("#good .sample"), "retry").focus();
  }
  document.getElementById("resolve-failure").onclick = () =>
    settleResponse(null);
  document.getElementById("resolve-success").onclick = () =>
    settleResponse(recoveredSnapshot);

  function render() {
    const rule = catalog.rules.find((entry) => entry.id === picker.value);
    root.removeAttribute("data-ready");
    root.dataset.rule = rule.id;
    document.body.dataset.behaviorRule = rule.id;
    request += 1;
    resolveResponse?.(null);
    resolveResponse = null;
    responseControls.hidden = true;
    snapshot =
      statePicker.value === "loading"
        ? null
        : statePicker.value === "loaded"
          ? recoveredSnapshot
          : statePicker.value === "empty"
            ? { count: 0, asOf: "09:05" }
            : initialSnapshot;
    attempt = "09:05";
    const stateExample = rule.id === "DR-009";
    const controls = document.querySelector(".example-controls");
    let heading = document.querySelector("#rule-heading");
    const headingTag = stateExample && !root.dataset.fixedRule ? "H1" : "H2";
    if (heading.tagName !== headingTag) {
      const replacement = document.createElement(headingTag.toLowerCase());
      replacement.id = heading.id;
      heading.replaceWith(replacement);
      heading = replacement;
    }
    const pair = document.querySelector(".behavior-pair");
    if (stateExample && pair.nextElementSibling !== controls)
      pair.after(controls);
    else if (!stateExample && controls.nextElementSibling !== heading)
      heading.before(controls);
    document.getElementById("request-control").hidden = !stateExample;
    document.getElementById("example-limit").hidden = true;
    const notes = /** @type {HTMLDetailsElement} */ (
      document.querySelector(".review-notes")
    );
    notes.open = !stateExample;
    document.querySelector("#rule-heading").textContent = stateExample
      ? "A failed refresh is not zero shipments."
      : `${rule.id} — ${rule.title}`;
    document.querySelector("#good-heading").textContent = stateExample
      ? "Keeps known state"
      : "Good for this task";
    document.querySelector("#bad-heading").textContent = stateExample
      ? "Overwrites known state"
      : "Bad for this task";
    const sharedFacts = {
      failed:
        "At 09:00, both views received 12 shipments. The 09:05 refresh failed.",
      loading: "Both views are waiting for their first shipment response.",
      refreshing:
        "Both views retain 12 shipments from 09:00 while a refresh is pending.",
      retrying:
        "Both views retain the same 09:00 snapshot while retrying a failed refresh.",
      loaded:
        "Both views received a successful response: 18 shipments as of 09:05.",
      empty: "Both views received an observed empty snapshot as of 09:05.",
      filtered:
        "The snapshot contains 12 shipments; none match the Seattle filter.",
      submitting:
        "The publication request has been submitted but not yet queued.",
      queued: "The publication has been queued but has not completed.",
      completed:
        "The publication has completed, confirmed by the response fixture.",
    };
    document.querySelector("#task").textContent = stateExample
      ? sharedFacts[statePicker.value]
      : rule.task;
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
    root.dataset.shipmentState = statePicker.value;
    root.dataset.ready = "true";
  }

  function configure(sample, id, good) {
    if (id === "DR-009") paintShipment(sample, good);
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
      const help = find(sample, "help");
      help.id = `proposal-help-${good ? "good" : "bad"}`;
      input.setAttribute("aria-describedby", `${help.id} ${error.id}`);
      let approved = 5;
      let previous = 5;
      let proposed = null;
      const commit = () => {
        previous = approved;
        approved = proposed;
        find(sample, "approved").textContent = `${approved}%`;
        find(sample, "result").hidden = false;
        find(sample, "result").textContent =
          `Applied ${approved}% reduction to the 12 selected lanes.`;
        find(sample, "undo").hidden = false;
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
          error.textContent = "Entered value is outside the allowed range.";
          input.setAttribute("aria-invalid", "true");
          if (!good) input.value = "";
          input.focus();
          return;
        }
        error.hidden = true;
        input.removeAttribute("aria-invalid");
        proposed = value;
        find(sample, "review").textContent =
          `Change the approved reduction from ${approved}% to ${proposed}% for 12 selected lanes.`;
        dialog.showModal();
      };
      find(sample, "cancel").onclick = () => dialog.close();
      find(sample, "confirm").onclick = () => {
        commit();
        dialog.close();
      };
      find(sample, "undo").onclick = () => {
        approved = previous;
        find(sample, "approved").textContent = `${approved}%`;
        find(sample, "result").hidden = false;
        find(sample, "result").textContent =
          `Restored the approved reduction to ${approved}%.`;
        find(sample, "undo").hidden = true;
      };
    }
    if (id === "DR-013") configurePriority(sample, good);
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
    pauseResponse.checked = false;
    largerText.checked = false;
    render();
  });
  render();
}
start().catch(() => {
  document.getElementById("load-error").hidden = false;
});
