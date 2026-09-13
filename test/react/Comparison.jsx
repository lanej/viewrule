import { useState } from "react";
import { createRoot } from "react-dom/client";

const root = document.getElementById("root");
const state = root.dataset.fixture;
const broken = state === "broken";
const period = broken && innerWidth >= 2000 ? "7 days" : "30 days";

function Summary() {
  return (
    <div className="metrics">
      <section className="metric" data-viewrule="metric">
        <h2>On time</h2>
        <strong>98.2%</strong>
        <p>Last 30 days · +0.8 points vs prior period</p>
      </section>
      <section className="metric" data-viewrule="metric">
        <h2>Average cost</h2>
        <strong>USD 5.42</strong>
        <p>Last 30 days · −0.18 vs prior period</p>
      </section>
    </div>
  );
}

function Context() {
  return (
    <aside data-viewrule="prose" className="context">
      <h2>Reliability trend</h2>
      <svg
        viewBox="0 0 280 120"
        role="img"
        aria-label="On-time delivery rose from 97.2 to 98.2 percent over the last 30 days"
      >
        <path
          d="M 32 82 L 96 65 L 164 70 L 230 35"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="8" y="104">
          97.2%
        </text>
        <text x="207" y="23">
          98.2%
        </text>
      </svg>
      <p>
        Share of delivered parcels arriving on time. Last 30 days; illustrative
        data.
      </p>
      <h2>Choose a service</h2>
      <p>
        Compare cost and reliability together. Review the delivery commitment
        before choosing the lowest price.
      </p>
    </aside>
  );
}

function Comparison() {
  const [service, setService] = useState("Ground");
  const [notice, setNotice] = useState("");
  const rows = Array.from(
    { length: state === "finite" ? 4 : 12 },
    (_, index) => index + 1,
  );
  return (
    <div data-state={state}>
      <header data-viewrule="page-header">
        <h1>Carrier comparison</h1>
        <p id="comparison-guidance">
          Choose a service by price and reliability.
        </p>
      </header>
      <main>
        <form className="toolbar" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="service">Service</label>
          <select
            id="service"
            value={service}
            onChange={(event) => setService(event.target.value)}
          >
            <option>Ground</option>
            <option>Express</option>
          </select>
          <button
            type="button"
            className="download"
            aria-label="Prepare comparison export"
            onClick={() => setNotice("Comparison ready")}
          >
            ↓
          </button>
          <span role="status">{notice}</span>
        </form>
        <Summary />
        <div className="workspace">
          <table
            data-viewrule={
              root.dataset.annotations === "missing" ? undefined : "comparison"
            }
            data-measure="carrier-comparison"
            data-period={period}
          >
            <caption data-viewrule="context" hidden={broken}>
              {service} services · USD per parcel · On-time share of delivered
              parcels · Last {period} · Illustrative data
            </caption>
            <thead>
              <tr>
                <th scope="col">Carrier</th>
                <th scope="col" data-viewrule-number>
                  Cost (USD)
                </th>
                <th scope="col" data-viewrule-number>
                  On time
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((number) => (
                <tr key={number} data-viewrule-key={`carrier-${number}`}>
                  <td data-viewrule="cell">
                    <span data-viewrule="label">
                      Carrier {number} {service.toLowerCase()}
                    </span>
                  </td>
                  <td data-viewrule="cell" data-viewrule-number>
                    {(5 + (number - 1) / 10).toFixed(2)}
                  </td>
                  <td data-viewrule="cell" data-viewrule-number>
                    {(98 - (number - 1) / 10).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Context />
        </div>
      </main>
    </div>
  );
}

createRoot(root).render(<Comparison />);
