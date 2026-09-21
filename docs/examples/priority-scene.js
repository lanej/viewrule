// Shared DR-013 component behavior; safe to evaluate in the browser checkpoint.
export function configurePriority(sample, good) {
  const hierarchy = sample.querySelector(".hierarchy");
  // Only the reading order changes; styles, facts, and behavior are shared.
  if (!good) hierarchy.prepend(sample.querySelector(".volume"));
  const trigger = sample.querySelector('[data-role="respond"]');
  const result = sample.querySelector('[data-role="result"]');
  result.id = `priority-result-${good ? "good" : "bad"}`;
  trigger.setAttribute("aria-controls", result.id);
  const setOpen = (open) => {
    result.textContent = open
      ? "EP 1042, EP 1047, and EP 1051 are awaiting address corrections."
      : "";
    result.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    trigger.textContent = open ? "Hide exceptions" : "Review 3 exceptions";
  };
  trigger.onclick = () => setOpen(result.hidden);
  sample.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !result.hidden) {
      setOpen(false);
      trigger.focus();
    }
  });
}
