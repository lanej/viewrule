// Shared synthetic data and state keep the paired comparisons equivalent.
const root = document.getElementById("evidence-examples");
const toggle = document.getElementById("evidence-toggle");
const carriers = [
  {
    name: "Aster",
    count: 240,
    color: "#23866a",
    cost: "$8.20",
    window: "2 days",
    reliability: "97%",
    service: "Ground",
    volume: "240 parcels",
  },
  {
    name: "Beacon",
    count: 360,
    color: "#4679bd",
    cost: "$9.40",
    window: "1 day",
    reliability: "99%",
    service: "Express",
    volume: "360 parcels",
  },
];
let alternate = false;
const find = (sample, role) => sample.querySelector(`[data-role="${role}"]`);
function render() {
  for (const quality of ["good", "bad"]) {
    const good = quality === "good";
    const sample = root.querySelector(`#${quality} .sample`);
    const id = root.dataset.rule;
    if (id === "DR-001" || id === "DR-002") {
      const charts = find(sample, "charts");
      charts.replaceChildren();
      const values =
        id === "DR-001"
          ? alternate
            ? [120, 320]
            : [240, 360]
          : alternate
            ? [40, 50]
            : [30, 60];
      values.forEach((value, index) => {
        const minimum = id === "DR-002" && !good ? 25 : 0;
        const maximum = id === "DR-001" ? (good ? 400 : value) : 60;
        const label = document.createElement("p");
        label.textContent = `${carriers[index].name}: ${value} parcels · axis ${minimum}–${maximum}`;
        const track = document.createElement("div");
        track.className = "bar-track";
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.width = `${(100 * (value - minimum)) / (maximum - minimum)}%`;
        track.append(bar);
        charts.append(label, track);
      });
    }
    if (id === "DR-003") {
      find(sample, "value").textContent = alternate ? "5.0%" : "7.2%";
      find(sample, "context").hidden = !good;
      find(sample, "details").textContent = good
        ? `${alternate ? "50 of 1,000 · Last 7 days" : "720 of 10,000 · Last 30 days"} · Ground parcels delivered late. Source: synthetic delivery log, as of September 14, 2026.`
        : "";
    }
    if (id === "DR-004") {
      find(sample, "observation").textContent = alternate
        ? "Tuesday: 0 parcels (observed)"
        : good
          ? "Tuesday: unavailable — no observation"
          : "Tuesday: 0 parcels";
      find(sample, "estimate").textContent = good
        ? "Wednesday: 18 parcels (estimate)"
        : "Wednesday: 18 parcels";
    }
    if (id === "DR-005") {
      const list = find(sample, "carriers");
      list.replaceChildren();
      (alternate ? [...carriers].reverse() : carriers).forEach(
        (carrier, index) => {
          const item = document.createElement("li");
          const swatch = document.createElement("span");
          swatch.className = "swatch";
          swatch.style.background = good
            ? carrier.color
            : carriers[index].color;
          item.append(swatch, `${carrier.name}: ${carrier.count} parcels`);
          list.append(item);
        },
      );
    }
    if (id === "DR-006" || id === "DR-007") {
      const list = find(sample, "carriers");
      list.replaceChildren();
      const selected = alternate ? 1 : 0;
      if (id === "DR-006")
        find(sample, "selection").textContent =
          `Selected: ${carriers[selected].name}`;
      else {
        find(sample, "layout").textContent = alternate
          ? "Larger layout simulation"
          : "Compact layout simulation";
        list.dataset.large = String(alternate);
      }
      carriers.forEach((carrier, index) => {
        if (id === "DR-006" && !good && index !== selected) return;
        const row = document.createElement("p");
        row.textContent = `${carrier.name}: ${carrier.cost} · ${carrier.window} · ${carrier.reliability} on time`;
        if (id === "DR-007" && good && alternate)
          row.append(` · ${carrier.service} · ${carrier.volume}`);
        list.append(row);
      });
    }
    if (id === "DR-008") find(sample, "detail").hidden = !alternate;
  }
  toggle.setAttribute("aria-pressed", String(alternate));
  root.dataset.ready = "true";
}
toggle.addEventListener("click", () => {
  alternate = !alternate;
  render();
});
render();
