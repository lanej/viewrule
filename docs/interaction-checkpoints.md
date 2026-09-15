# Interaction checkpoints

A route is not always a meaningful review state. Drawers, filtered results, expanded diagnostics, and recoverable failures often appear only after interaction.

A page can declare named checkpoints in `.ui-review/config.json`:

```json
{
  "name": "Shipments",
  "path": "/shipments",
  "ready": "[data-ready]",
  "checkpoints": [
    { "name": "details-open", "setup": ".ui-review/checkpoints/details-open.mjs" }
  ]
}
```

The setup file is application-owned Playwright code:

```js
export default async function ({ page }) {
  await page.getByRole("row", { name: /shipment 123/ }).click();
  await page.getByRole("complementary").waitFor();
}
```

Viewrule navigates to the configured route in a fresh browser context for each checkpoint and viewport, waits for the page readiness selector, executes the checkpoint, then captures evidence and runs the same applicable rules. Reports preserve the checkpoint name and setup path.

Checkpoint modules must remain inside the project and default-export a function. Viewrule deliberately does not define a click/type/wait DSL; Playwright remains the interaction API. Pages without checkpoints retain route-only review behavior.
