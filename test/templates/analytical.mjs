// Metadata and its visible label always describe the same fixture period.
const period =
  document.body.dataset.state === "broken" && innerWidth >= 2000
    ? "7 days"
    : "30 days";
document.querySelector("table").dataset.period = period;
document.querySelector(".period").textContent = "Last " + period;
