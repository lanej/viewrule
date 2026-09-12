// Deterministic examples of the shipped analytical preset, with illustrative data.
// The good states are fixture expectations, never fabricated human approvals.
export function analyticalHtml(state = "compact") {
  if (!["broken", "compact", "stretched", "finite"].includes(state)) throw new Error(`Unknown fixture ${state}`);
  const broken = state === "broken", finite = state === "finite";
  const rows = Array.from({ length: finite ? 4 : 12 }, (_, i) => `<tr data-viewrule-key="carrier-${i + 1}">
    <td data-viewrule="cell"><span data-viewrule="label">Carrier ${i + 1} ground</span></td>
    <td data-viewrule="cell">${(5 + i / 10).toFixed(2)}</td>
    <td data-viewrule="cell">${(98 - i / 10).toFixed(1)}%</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Carrier comparison</title>
<style>
body{margin:24px;color:#142c27;background:white;font:14px Arial,sans-serif}
header{height:${broken ? 450 : 96}px}
.metrics{display:flex;gap:24px;margin-bottom:20px}.metric{box-sizing:border-box;width:220px;padding:8px;border-bottom:1px solid #ccc}
.metric h2{font-size:18px}.metric p{margin:8px 0}
table{border-collapse:collapse;table-layout:fixed;width:440px;max-width:100%}
caption{text-align:left;margin-bottom:12px;line-height:1.4}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #ddd}
th:first-child{width:140px}th:nth-child(n+2),td:nth-child(n+2){text-align:right;font-variant-numeric:tabular-nums}
tbody tr:nth-child(n+9){display:none}
@media(min-width:2000px){tbody tr:nth-child(n+9){display:table-row}
${state === "stretched" ? "table{width:100%}" : ""}
${broken ? "tbody tr:nth-child(2){display:none}" : ""}}
${broken ? ".metric:nth-child(2){position:relative;top:20px;left:-100px}td{font-size:12px}[data-viewrule=label]{display:block;width:48px;overflow:hidden;white-space:nowrap}" : ""}
</style></head><body>
<header><h1>Carrier comparison</h1><p>Choose a ground service by price and reliability.</p></header>
<main><div class="metrics">
<section class="metric" data-viewrule="metric"><h2>On time</h2><strong>98.2%</strong><p>Last 30 days · +0.8 points vs prior period</p></section>
<section class="metric" data-viewrule="metric"><h2>Average cost</h2><strong>USD 5.42</strong><p>Last 30 days · −0.18 vs prior period</p></section>
</div><table data-viewrule="comparison" data-measure="carrier-comparison">
<caption data-viewrule="context" ${broken ? "hidden" : ""}>Ground services · USD per parcel · On-time share of delivered parcels · <span class="period">Last 30 days</span> · Illustrative data</caption>
<thead><tr><th scope="col">Carrier</th><th scope="col">Cost (USD)</th><th scope="col">On time</th></tr></thead>
<tbody>${rows}</tbody></table></main>
<script>
const period = ${broken} && innerWidth >= 2000 ? "7 days" : "30 days";
document.querySelector("table").dataset.period = period;
document.querySelector(".period").textContent = "Last " + period;
</script></body></html>`;
}
