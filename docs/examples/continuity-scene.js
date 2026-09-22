// Shared queue behavior. The only counterexample mutation is loss of the query.
export function configureContinuity(sample, good) {
  const find = (role) => sample.querySelector(`[data-role="${role}"]`);
  const filter = find("filter");
  const dialog = find("dialog");
  const rows = [...sample.querySelectorAll("[data-shipment]")];
  let opener;
  const render = () => {
    const rawQuery = filter.value.trim();
    const query = rawQuery.toLowerCase();
    for (const row of rows)
      row.hidden = !row.dataset.destination.toLowerCase().includes(query);
    const count = rows.filter((row) => !row.hidden).length;
    const exactDestination =
      rawQuery &&
      rows.some((row) => row.dataset.destination.toLowerCase() === query);
    find("destination-scope-value").textContent =
      rawQuery || "All destinations";
    find("summary").textContent = !rawQuery
      ? `Showing ${count} shipments`
      : exactDestination
        ? `Showing ${count} shipment${count === 1 ? "" : "s"}`
        : `Showing ${count} shipment${count === 1 ? "" : "s"} matching “${rawQuery}”`;
    find("empty").hidden = count !== 0;
  };
  filter.oninput = render;
  for (const button of sample.querySelectorAll("[data-inspect]")) {
    button.onclick = () => {
      opener = button;
      const row = button.closest("[data-shipment]");
      find("selected").removeAttribute("data-role");
      row.querySelector("strong").setAttribute("data-role", "selected");
      for (const candidate of rows) {
        const selected = candidate === row;
        candidate.setAttribute("aria-current", String(selected));
        candidate.querySelector("[data-selection]").hidden = !selected;
      }
      find("detail-title").textContent = row.dataset.shipment;
      find("detail-route").textContent = `Oakland → ${row.dataset.destination}`;
      dialog.showModal();
    };
  }
  find("close").onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    if (!good) filter.value = "";
    render();
    if (opener && !opener.closest("[data-shipment]").hidden) opener.focus();
    else filter.focus();
  });
  render();
}
