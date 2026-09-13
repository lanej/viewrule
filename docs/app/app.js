import { carriers, shipments, statuses, defects } from "./data.js";

/** @template {Element} T
 * @param {string} selector
 * @returns {T} */
function $(selector) {
  return /** @type {T} */ (document.querySelector(selector));
}
function clone(id) {
  return /** @type {DocumentFragment} */ (
    /** @type {HTMLTemplateElement} */ ($(id)).content.cloneNode(true)
  );
}
const app = /** @type {HTMLElement} */ ($("#application"));
const search = /** @type {HTMLInputElement} */ ($("#search"));
const statusFilter = /** @type {HTMLSelectElement} */ ($("#status-filter"));
const sort = /** @type {HTMLSelectElement} */ ($("#sort"));
const tabs = [...document.querySelectorAll("[data-tab]")];
const pageTitles = {
  overview: "Operations overview",
  shipments: "Shipment workspace",
  carriers: "Carrier comparison",
};
const params = new URLSearchParams(location.search);
const allowed = (value, values, fallback) =>
  values.includes(value) ? value : fallback;
const state = {
  page: allowed(params.get("page"), Object.keys(pageTitles), "overview"),
  view: allowed(params.get("view"), ["all", ...Object.keys(statuses)], "all"),
  query: params.get("q") || "",
  sort: allowed(params.get("sort"), ["id", "destination"], "id"),
  parcel: allowed(
    params.get("parcel"),
    shipments.map((s) => s.id),
    shipments[0].id,
  ),
  tab: allowed(
    params.get("tab"),
    ["overview", "events", "charges"],
    "overview",
  ),
  theme: allowed(params.get("theme"), ["system", "light", "dark"], "system"),
  navOpen:
    params.get("nav") === "closed"
      ? false
      : params.get("nav") === "open" || innerWidth >= 800,
  expanded: new Set(
    (params.get("expanded") || "")
      .split(",")
      .filter((id) => shipments.some((s) => s.id === id)),
  ),
  defects: new Set(
    (params.get("defects") || "")
      .split(",")
      .filter((id) => defects.some((d) => d.id === id)),
  ),
};
function saveURL() {
  const url = new URL(location.href);
  url.search = "";
  for (const [key, value] of Object.entries({
    page: state.page,
    view: state.view,
    q: state.query,
    sort: state.sort,
    parcel: state.parcel,
    tab: state.tab,
    theme: state.theme,
    nav: state.navOpen ? "open" : "closed",
    expanded: [...state.expanded].join(","),
    defects: [...state.defects].join(","),
  })) {
    if (value) url.searchParams.set(key, value);
  }
  history.replaceState(null, "", url);
}
function carrierFor(shipment) {
  return carriers.find((c) => c.id === shipment.carrier);
}
function noteFor(shipment) {
  if (shipment.status === "attention")
    return "Address review required. Confirm the recipient's details before the next dispatch. Delivery timing is at risk.";
  if (shipment.status === "delivered")
    return "Delivered to the receiving desk. No action needed.";
  return `On schedule. Last reported at ${shipment.facility}; the next scan has not been reported yet.`;
}
function renderCharts() {
  const charts = $("#carrier-charts");
  charts.replaceChildren();
  carriers.forEach((carrier, index) => {
    const fragment = clone("#chart-template");
    const figure = fragment.querySelector("figure");
    const baseline = state.defects.has("scales") ? [0, 80, 90][index] : 0;
    figure.dataset.carrier = carrier.id;
    figure.dataset.baseline = String(baseline);
    fragment.querySelector(".carrier-title").textContent = carrier.name;
    fragment.querySelector(".chart-domain").textContent = `${baseline}–100%`;
    fragment.querySelector(".axis-min").textContent = String(baseline);
    fragment.querySelector(".axis-mid").textContent = String(
      (baseline + 100) / 2,
    );
    carrier.values.forEach((value, day) => {
      const row = clone("#bar-template");
      const missing = value === null;
      const estimated = carrier.id === "cedar" && day === 6;
      const showMissing = missing && !state.defects.has("missing");
      const showEstimate = estimated && !state.defects.has("missing");
      const amount = value ?? 0;
      const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day];
      row.querySelector(".bar-day").textContent = dayLabel;
      row.querySelector(".bar-value").textContent = showMissing
        ? "—"
        : `${amount}${showEstimate ? "*" : ""}`;
      const bar = /** @type {HTMLElement} */ (row.querySelector(".bar"));
      bar.style.height = `${Math.max(0, ((amount - baseline) / (100 - baseline)) * 100)}%`;
      bar.classList.toggle("estimated", showEstimate);
      row.querySelector(".bar-description").textContent = showMissing
        ? "No observation"
        : `${amount}% on time${showEstimate ? ", estimate" : ""}`;
      fragment.querySelector(".bars").append(row);
    });
    charts.append(fragment);
  });
  $(".chart-footnote").textContent = state.defects.has("scales")
    ? "Deliberate scale defect: compare the labeled baselines. — No observation · * Striped bar: estimate."
    : "— No observation · * Striped bar: estimate, not an observed result. Reference bars share a 0–100% scale.";
}
function renderQueue() {
  const filtered = shipments
    .filter(
      (s) =>
        (state.view === "all" || s.status === state.view) &&
        `${s.id} ${s.destination} ${s.customer} ${carrierFor(s).name}`
          .toLowerCase()
          .includes(state.query.trim().toLowerCase()),
    )
    .sort((a, b) => a[state.sort].localeCompare(b[state.sort]));
  if (!filtered.some((s) => s.id === state.parcel) && filtered.length)
    state.parcel = filtered[0].id;
  const list = $("#shipment-list");
  list.replaceChildren();
  filtered.forEach((shipment) => {
    const row = clone("#shipment-template");
    const fields = {
      ...shipment,
      carrier: carrierFor(shipment).name,
      status: statuses[shipment.status],
      eta: `${shipment.eta}${shipment.status === "delivered" ? " · Delivered" : " · Estimated"}`,
      scan: `Last scan: ${shipment.facility}, Sep 13 at ${shipment.time} PDT. ${noteFor(shipment)}`,
    };
    row.querySelectorAll("[data-field]").forEach((field) => {
      field.textContent = fields[field.getAttribute("data-field")];
    });
    row.querySelector(".shipment-row").setAttribute("data-key", shipment.id);
    row
      .querySelector(".shipment-row")
      .classList.toggle("is-selected", shipment.id === state.parcel);
    row
      .querySelector(".carrier-name")
      .setAttribute("data-carrier", shipment.carrier);
    row
      .querySelector(".status-badge")
      .setAttribute("data-status", shipment.status);
    const select = row.querySelector(".select-parcel");
    select.setAttribute("aria-pressed", String(shipment.id === state.parcel));
    select.addEventListener("click", () => {
      state.parcel = shipment.id;
      render();
      /** @type {HTMLButtonElement} */ (
        $(`.shipment-row[data-key="${shipment.id}"] .select-parcel`)
      ).focus();
    });
    const expand = row.querySelector(".expand-parcel");
    const disclosure = /** @type {HTMLElement} */ (
      row.querySelector(".shipment-disclosure")
    );
    disclosure.id = `disclosure-${shipment.id.replace(" ", "-")}`;
    disclosure.hidden = !state.expanded.has(shipment.id);
    expand.setAttribute("aria-expanded", String(!disclosure.hidden));
    expand.setAttribute("aria-controls", disclosure.id);
    expand.setAttribute("aria-label", `Shipment details for ${shipment.id}`);
    expand.addEventListener("click", () => {
      if (state.expanded.has(shipment.id)) state.expanded.delete(shipment.id);
      else state.expanded.add(shipment.id);
      disclosure.hidden = !state.expanded.has(shipment.id);
      expand.setAttribute("aria-expanded", String(!disclosure.hidden));
      saveURL();
    });
    list.append(row);
  });
  $("#result-count").textContent =
    `${filtered.length} of ${shipments.length} shipments`;
  /** @type {HTMLElement} */ ($("#empty-state")).hidden = filtered.length > 0;
  /** @type {HTMLElement} */ ($("#parcel-section")).hidden =
    filtered.length === 0 && state.page !== "carriers";
  /** @type {HTMLElement} */ ($("#quotes-section")).hidden =
    filtered.length === 0 && state.page !== "carriers";
}
function renderParcel() {
  const shipment = shipments.find((s) => s.id === state.parcel);
  $("#parcel-heading").textContent = shipment.id;
  $("#parcel-route").textContent = `Oakland, CA → ${shipment.destination}`;
  $("#parcel-status").textContent = statuses[shipment.status];
  $("#parcel-status").setAttribute("data-status", shipment.status);
  document.querySelectorAll("[data-parcel]").forEach((field) => {
    field.textContent = shipment[field.getAttribute("data-parcel")];
  });
  $("#parcel-note").textContent = noteFor(shipment);
  document.querySelectorAll(".journey li").forEach((step, index) => {
    if (
      index ===
      (shipment.status === "delivered"
        ? 2
        : shipment.status === "attention" && shipment.facility === "Oakland"
          ? 0
          : 1)
    )
      step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
  tabs.forEach((button) => {
    const active = button.getAttribute("data-tab") === state.tab;
    button.setAttribute("aria-selected", String(active));
    /** @type {HTMLButtonElement} */ (button).tabIndex = active ? 0 : -1;
    /** @type {HTMLElement} */ (
      $(`#panel-${button.getAttribute("data-tab")}`)
    ).hidden = !active;
  });
  const events = $("#event-list");
  events.replaceChildren();
  for (const line of [
    `Sep 13 · ${shipment.time} PDT — ${shipment.facility}: ${statuses[shipment.status]}`,
    "Sep 12 · 16:20 PDT — Oakland: parcel received",
    "Sep 12 · 14:05 PDT — Oakland: label created",
  ]) {
    const item = document.createElement("li");
    item.textContent = line;
    events.append(item);
  }
  $("#postage").textContent = carrierFor(shipment).rate.toFixed(2);
  $("#charge-total").textContent = (carrierFor(shipment).rate + 0.8).toFixed(2);
  $("#quote-context").textContent =
    `${shipment.id} · Oakland → ${shipment.destination}`;
  const quotes = $("#quote-list");
  quotes.replaceChildren();
  carriers.forEach((carrier) => {
    const row = clone("#quote-template");
    row.querySelector(".carrier-name").textContent = carrier.name;
    row.querySelector(".carrier-name").setAttribute("data-carrier", carrier.id);
    row.querySelector(".quote-service").textContent =
      carrier.id === "aster"
        ? "Ground"
        : carrier.id === "beacon"
          ? "Priority"
          : "Express";
    row.querySelector(".quote-window").textContent = carrier.days;
    row.querySelector(".quote-amount").textContent = carrier.rate.toFixed(2);
    quotes.append(row);
  });
}
function render() {
  app.dataset.page = state.page;
  app.classList.toggle("nav-closed", !state.navOpen);
  /** @type {HTMLElement} */ ($("#sidebar")).hidden = !state.navOpen;
  $("#nav-toggle").setAttribute("aria-expanded", String(state.navOpen));
  $("#nav-toggle").setAttribute(
    "aria-label",
    state.navOpen ? "Close navigation" : "Open navigation",
  );
  $("#page-heading").textContent = pageTitles[state.page];
  document.querySelectorAll("[data-page]").forEach((button) => {
    if (button === app) return;
    if (button.getAttribute("data-page") === state.page)
      button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document
    .querySelectorAll("[data-view]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.getAttribute("data-view") === state.view),
      ),
    );
  defects.forEach((defect) =>
    app.classList.toggle(`defect-${defect.id}`, state.defects.has(defect.id)),
  );
  $("#mode-label").textContent = state.defects.size
    ? `${state.defects.size} deliberate design ${state.defects.size === 1 ? "defect" : "defects"} active`
    : "Reference layout · fictional data";
  statusFilter.value = state.view;
  sort.value = state.sort;
  search.value = state.query;
  document.documentElement.style.colorScheme =
    state.theme === "system" ? "light dark" : state.theme;
  renderCharts();
  renderQueue();
  renderParcel();
  saveURL();
  app.dataset.ready = "true";
}
document.querySelectorAll("[data-count]").forEach((element) => {
  const status = element.getAttribute("data-count");
  element.textContent = String(
    status === "all"
      ? shipments.length
      : shipments.filter((s) => s.status === status).length,
  );
});
defects.forEach((defect) => {
  const row = clone("#defect-template");
  const input = row.querySelector("input");
  input.value = defect.id;
  input.checked = state.defects.has(defect.id);
  row.querySelector("strong").textContent = defect.title;
  row.querySelector(".defect-rule").textContent = defect.rule;
  row.querySelector(".defect-description").textContent = defect.description;
  row.querySelector("small").textContent = defect.detector;
  input.addEventListener("change", () => {
    if (input.checked) state.defects.add(defect.id);
    else state.defects.delete(defect.id);
    render();
  });
  $("#defect-controls").append(row);
});
$("#lab-toggle").addEventListener("click", () => {
  const panel = /** @type {HTMLElement} */ ($("#design-lab"));
  panel.hidden = !panel.hidden;
  $("#lab-toggle").setAttribute("aria-expanded", String(!panel.hidden));
});
$("#reset-design").addEventListener("click", () => {
  state.defects.clear();
  document.querySelectorAll(".defect-option input").forEach((input) => {
    /** @type {HTMLInputElement} */ (input).checked = false;
  });
  render();
});
document.querySelectorAll("[data-page]").forEach((button) =>
  button.addEventListener("click", () => {
    state.page = button.getAttribute("data-page");
    render();
  }),
);
document.querySelectorAll("[data-view]").forEach((button) =>
  button.addEventListener("click", () => {
    state.view = button.getAttribute("data-view");
    state.page = "shipments";
    render();
  }),
);
search.addEventListener("input", () => {
  state.query = search.value;
  render();
});
statusFilter.addEventListener("change", () => {
  state.view = statusFilter.value;
  render();
});
sort.addEventListener("change", () => {
  state.sort = sort.value;
  render();
});
$("#clear-filters").addEventListener("click", () => {
  state.query = "";
  state.view = "all";
  render();
  search.focus();
});
$("#nav-toggle").addEventListener("click", () => {
  state.navOpen = !state.navOpen;
  render();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const lab = /** @type {HTMLElement} */ ($("#design-lab"));
  if (!lab.hidden) {
    lab.hidden = true;
    $("#lab-toggle").setAttribute("aria-expanded", "false");
    /** @type {HTMLButtonElement} */ ($("#lab-toggle")).focus();
  } else if (state.navOpen) {
    state.navOpen = false;
    render();
    /** @type {HTMLButtonElement} */ ($("#nav-toggle")).focus();
  }
});
tabs.forEach((button, index) => {
  button.addEventListener("click", () => {
    state.tab = button.getAttribute("data-tab");
    render();
  });
  button.addEventListener("keydown", (/** @type {KeyboardEvent} */ event) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index + tabs.length - 1) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    state.tab = tabs[next].getAttribute("data-tab");
    render();
    /** @type {HTMLButtonElement} */ (tabs[next]).focus();
  });
});
const theme = /** @type {HTMLSelectElement} */ ($("#theme"));
theme.value = state.theme;
theme.addEventListener("change", () => {
  state.theme = theme.value;
  render();
});
render();
