(() => {
  const root = document.getElementById("viewrule-examples");
  const picker = /** @type {HTMLSelectElement} */ (
    root.querySelector("#vr-pattern")
  );
  const scenes = [
    .../** @type {NodeListOf<HTMLElement>} */ (
      root.querySelectorAll(".vr-scene")
    ),
  ];
  const descriptions = {
    drawers: [
      "Bounded framing · DR-008",
      "Project rule · drawer header ≤ 56px",
    ],
    diagram: [
      "Readable text · DR-007",
      "Built-in axe check · normal text ≥ 4.5:1",
    ],
    tabs: [
      "Complete labels · DR-006",
      "Scoped no-clip check · visible tab labels",
    ],
    menu: [
      "Usable controls · DR-007",
      "Baseline warning · bounds below 24 × 24px",
    ],
    hamburger: [
      "Navigation keeps task context visible · DR-006",
      "Project rule · no overlap between open navigation and workspace",
    ],
    sidebar: [
      "Framing leaves room for work · DR-008",
      "Project rule · workspace banner ≤ 104px at desktop widths (≥ 760px)",
    ],
    numbers: [
      "Aligned amounts · DR-006",
      "Analytical preset · right/end alignment on declared amounts",
    ],
    spacing: [
      "Related values stay close · DR-007",
      "Analytical preset · text gap ≤ 160px",
    ],
  };
  const openDrawers = new Set();
  let tabIndex = 0;
  let menuOpen = false;
  let menuIndex = 0;
  const tabContent = [
    ["In transit", "Oakland → Seattle", "Ground service · Expected Sep 15"],
    [
      "Latest delivery events",
      "Sep 13 · Portland facility",
      "Sep 12 · Picked up in Oakland",
    ],
    ["Charges in USD", "Postage: 5.40", "Insurance: 0.80 · Total: 6.20"],
  ];
  const menuLabels = ["Shipments", "Billing", "Settings"];
  const menuContent = [
    "3 parcels moving through your network.",
    "Your next statement closes Sep 30.",
    "Manage shipment notifications and preferences.",
  ];
  const shipments = [
    {
      id: "EP 1042",
      route: "Oakland → Seattle",
      status: "In transit",
      filter: "transit",
      eta: "Sep 15, 2026",
      scan: "Portland · Sep 13 at 08:40",
      step: 1,
      note: "On schedule. Next stop: Seattle delivery facility.",
    },
    {
      id: "EP 1043",
      route: "Oakland → Denver",
      status: "Address issue",
      filter: "attention",
      eta: "Sep 16, 2026 · At risk",
      scan: "Oakland · Sep 13 at 07:55",
      step: 0,
      note: "Apartment number missing. Confirm the address before dispatch.",
    },
    {
      id: "EP 1044",
      route: "Oakland → Austin",
      status: "Delivered",
      filter: "delivered",
      eta: "Sep 13, 2026 · Delivered",
      scan: "Austin · Sep 13 at 07:12",
      step: 2,
      note: "Delivered to the receiving desk. No action needed.",
    },
    {
      id: "EP 1045",
      route: "Oakland → Portland",
      status: "In transit",
      filter: "transit",
      eta: "Sep 14, 2026",
      scan: "Eugene · Sep 13 at 08:15",
      step: 1,
      note: "On schedule. Expected at the Portland facility this afternoon.",
    },
  ];
  let workspaceOpen = true;
  let workspaceFilter = "all";
  let shipmentId = shipments[0].id;
  function cloneTemplate(id) {
    return /** @type {DocumentFragment} */ (
      /** @type {HTMLTemplateElement} */ (
        root.querySelector(`#${id}`)
      ).content.cloneNode(true)
    );
  }
  function fillShipment(element, shipment) {
    element.querySelectorAll("[data-work-value]").forEach((value) => {
      value.textContent = shipment[value.getAttribute("data-work-value")];
    });
  }
  function syncWorkspace() {
    const filtered = shipments.filter(
      (shipment) =>
        workspaceFilter === "all" || shipment.filter === workspaceFilter,
    );
    if (!filtered.some((shipment) => shipment.id === shipmentId))
      shipmentId = filtered[0].id;
    const selected = filtered.find((shipment) => shipment.id === shipmentId);
    scenes.forEach((scene) => {
      const app = scene.querySelector(".vr-work-app");
      if (!app) return;
      const trigger = app.querySelector(".vr-work-toggle");
      if (trigger) {
        trigger.setAttribute("aria-expanded", String(workspaceOpen));
        trigger.setAttribute(
          "aria-label",
          workspaceOpen
            ? "Close workspace navigation"
            : "Open workspace navigation",
        );
        /** @type {HTMLElement} */ (app.querySelector(".vr-work-nav")).hidden =
          !workspaceOpen;
        app
          .querySelector(".vr-work-body")
          .classList.toggle("vr-nav-closed", !workspaceOpen);
      }
      app.querySelectorAll("[data-work-filter]").forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.getAttribute("data-work-filter") === workspaceFilter),
        );
      });
      app.querySelector(".vr-work-count").textContent =
        `${filtered.length} ${filtered.length === 1 ? "parcel" : "parcels"}`;
      app.querySelectorAll(".vr-work-list li").forEach((row, i) => {
        /** @type {HTMLElement} */ (row).hidden = !filtered.includes(
          shipments[i],
        );
        row
          .querySelector("button")
          .setAttribute("aria-pressed", String(shipments[i].id === shipmentId));
      });
      const detail = app.querySelector(".vr-work-detail");
      fillShipment(detail, selected);
      detail.querySelectorAll(".vr-work-timeline li").forEach((step, i) => {
        if (i === selected.step) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      });
    });
    requestAnimationFrame(measure);
  }
  function bindWorkspace(scene, side) {
    const app = scene.querySelector(".vr-work-app");
    if (!app) return;
    const nav = app.querySelector(".vr-work-nav");
    nav.append(cloneTemplate("vr-work-navigation"));
    nav.id = `vr-work-nav-${side}`;
    nav
      .querySelector("nav")
      .setAttribute(
        "aria-label",
        `${side === 0 ? "Good" : "Bad"} example shipment views`,
      );
    app.querySelector(".vr-work-main").append(cloneTemplate("vr-work-content"));
    const list = app.querySelector(".vr-work-list");
    shipments.forEach((shipment) => {
      const row = cloneTemplate("vr-work-row");
      fillShipment(row, shipment);
      row.querySelector("button").addEventListener("click", () => {
        shipmentId = shipment.id;
        syncWorkspace();
      });
      list.append(row);
    });
    app.querySelectorAll("[data-work-filter]").forEach((button) =>
      button.addEventListener("click", () => {
        workspaceFilter = button.getAttribute("data-work-filter");
        syncWorkspace();
      }),
    );
    const trigger = /** @type {HTMLButtonElement} */ (
      app.querySelector(".vr-work-toggle")
    );
    if (!trigger) return;
    trigger.setAttribute("aria-controls", nav.id);
    trigger.addEventListener("click", () => {
      workspaceOpen = !workspaceOpen;
      syncWorkspace();
    });
    scene.onkeydown = (event) => {
      if (event.key === "Escape" && workspaceOpen) {
        workspaceOpen = false;
        syncWorkspace();
        trigger.focus();
      }
    };
  }
  function syncDrawers() {
    scenes.forEach((scene) =>
      scene.querySelectorAll(".vr-drawer").forEach((el, i) => {
        el.querySelector(".vr-disclosure").setAttribute(
          "aria-expanded",
          String(openDrawers.has(i)),
        );
        /** @type {HTMLElement} */ (
          el.querySelector(".vr-drawer-body")
        ).hidden = !openDrawers.has(i);
      }),
    );
  }
  function syncTabs() {
    scenes.forEach((scene, side) => {
      const buttons = [
        .../** @type {NodeListOf<HTMLButtonElement>} */ (
          scene.querySelectorAll('[role="tab"]')
        ),
      ];
      const panel = scene.querySelector('[role="tabpanel"]');
      if (!panel) return;
      buttons.forEach((button, i) => {
        button.setAttribute("aria-selected", String(i === tabIndex));
        button.tabIndex = i === tabIndex ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", `vr-tab-${side}-${tabIndex}`);
      panel.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = tabContent[tabIndex][0];
      const paragraph = document.createElement("p");
      paragraph.append(
        document.createTextNode(tabContent[tabIndex][1]),
        document.createElement("br"),
        document.createTextNode(tabContent[tabIndex][2]),
      );
      panel.append(strong, paragraph);
    });
  }
  function syncMenu() {
    scenes.forEach((scene) => {
      const trigger = scene.querySelector(".vr-menu-trigger");
      if (!trigger) return;
      trigger.setAttribute("aria-expanded", String(menuOpen));
      trigger.setAttribute(
        "aria-label",
        menuOpen ? "Close navigation" : "Open navigation",
      );
      /** @type {HTMLElement} */ (
        scene.querySelector(".vr-menu-panel")
      ).hidden = !menuOpen;
      scene.querySelectorAll(".vr-menu-panel button").forEach((button, i) => {
        if (i === menuIndex) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
      scene.querySelector(".vr-menu-content strong").textContent =
        menuLabels[menuIndex];
      scene.querySelector(".vr-menu-content p").textContent =
        menuContent[menuIndex];
    });
  }
  function rgb(value) {
    return value
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number);
  }
  function luminance(color) {
    const linear = color.map((v) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }
  function textGap(row) {
    const cells = [...row.children];
    const boxes = cells.map((cell) => {
      const range = document.createRange();
      range.selectNodeContents(cell);
      return range.getBoundingClientRect();
    });
    return Math.max(0, boxes[1].left - boxes[0].right);
  }
  function measure() {
    const key = picker.value;
    scenes.forEach((scene) => {
      let label = "";
      if (key === "drawers")
        label = `${Math.round(scene.querySelector(".vr-disclosure").getBoundingClientRect().height)}px headers`;
      if (key === "diagram") {
        const a = luminance(
          rgb(getComputedStyle(scene.querySelector(".vr-prose")).color),
        );
        const b = luminance(
          rgb(getComputedStyle(scene.parentElement).backgroundColor),
        );
        label = `${((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2)}:1 contrast`;
      }
      if (key === "tabs") {
        const clipped = [...scene.querySelectorAll('[role="tab"]')].filter(
          (button) => button.scrollWidth > button.clientWidth + 1,
        ).length;
        label = clipped ? `${clipped} clipped labels` : "Full labels";
      }
      if (key === "menu") {
        const box = scene
          .querySelector(".vr-menu-trigger")
          .getBoundingClientRect();
        label = `${Math.round(box.width)} × ${Math.round(box.height)}px`;
      }
      if (key === "numbers")
        label =
          getComputedStyle(scene.querySelector("td")).textAlign === "right"
            ? "Common right edge"
            : "Amounts left aligned";
      if (key === "spacing")
        label = `${Math.round(textGap(scene.querySelector("tbody tr")))}px text gap`;
      if (key === "hamburger") {
        const nav = scene.querySelector(".vr-work-nav").getBoundingClientRect();
        const work = scene
          .querySelector(".vr-work-main")
          .getBoundingClientRect();
        const width = Math.max(
          0,
          Math.min(nav.right, work.right) - Math.max(nav.left, work.left),
        );
        const height = Math.max(
          0,
          Math.min(nav.bottom, work.bottom) - Math.max(nav.top, work.top),
        );
        label = !workspaceOpen
          ? "Navigation closed · open it to compare"
          : width > 1 && height > 1
            ? `${Math.round(width)}px wide overlap`
            : "No overlap · context visible";
      }
      if (key === "sidebar") {
        const height = Math.round(
          scene.querySelector(".vr-work-banner").getBoundingClientRect().height,
        );
        label = `${height}px workspace banner${innerWidth < 760 ? " · desktop limit not applied" : " / 104px limit"}`;
      }
      scene.parentElement.querySelector(".vr-measure").textContent = label;
    });
    root.querySelector("#vr-observation").textContent = {
      drawers: "Same 3 parcels · linked drawer expansion",
      diagram: "Same words and diagram · color changes only",
      tabs: "Same 3 destinations · linked tab selection",
      menu: "Same navigation · linked menu controls",
      numbers: "Same quotes and precision · alignment changes only",
      spacing: "Same quotes · bounded width preserves proximity",
      hamburger:
        "Task: choose a shipment view while retaining the queue and parcel context. Toggle navigation, filter, or select a parcel in either example. Overlay navigation can suit other tasks; this project requires these regions to remain visible together.",
      sidebar:
        "Same sidebar, filters, queue, and parcel detail. Extra banner padding pushes the same evidence down without adding information. The 104px desktop limit is a project choice; use the real application's supported viewport sizes when assessing it.",
    }[key];
  }
  function render() {
    const key = picker.value;
    root.querySelector("#vr-rule").textContent = descriptions[key][0];
    root.querySelector("#vr-check").textContent = descriptions[key][1];
    root
      .querySelector(".vr-pair")
      .classList.toggle("vr-complex", key === "hamburger" || key === "sidebar");
    scenes.forEach((scene, side) => {
      scene.onkeydown = null;
      scene.replaceChildren(
        /** @type {HTMLTemplateElement} */ (
          root.querySelector(`#vr-${key}`)
        ).content.cloneNode(true),
      );
      bindWorkspace(scene, side);
      scene.querySelectorAll(".vr-disclosure").forEach((button, i) => {
        const body = button.nextElementSibling;
        body.id = `vr-drawer-${side}-${i}`;
        button.setAttribute("aria-controls", body.id);
        button.addEventListener("click", () => {
          if (openDrawers.has(i)) openDrawers.delete(i);
          else openDrawers.add(i);
          syncDrawers();
        });
      });
      /** @type {NodeListOf<HTMLButtonElement>} */ (
        scene.querySelectorAll('[role="tab"]')
      ).forEach((button, i) => {
        button.id = `vr-tab-${side}-${i}`;
        button.setAttribute("aria-controls", `vr-tab-panel-${side}`);
        button.addEventListener("click", () => {
          tabIndex = i;
          syncTabs();
        });
        button.addEventListener("keydown", (event) => {
          const count = tabContent.length;
          const next =
            event.key === "ArrowRight"
              ? (i + 1) % count
              : event.key === "ArrowLeft"
                ? (i + count - 1) % count
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? count - 1
                    : null;
          if (next === null) return;
          event.preventDefault();
          tabIndex = next;
          syncTabs();
          /** @type {HTMLButtonElement} */ (
            scene.querySelectorAll('[role="tab"]')[next]
          ).focus();
        });
      });
      const panel = scene.querySelector('[role="tabpanel"]');
      if (panel) panel.id = `vr-tab-panel-${side}`;
      const trigger = /** @type {HTMLButtonElement} */ (
        scene.querySelector(".vr-menu-trigger")
      );
      if (trigger) {
        trigger.setAttribute("aria-controls", `vr-menu-panel-${side}`);
        scene.querySelector(".vr-menu-panel").id = `vr-menu-panel-${side}`;
        trigger.addEventListener("click", () => {
          menuOpen = !menuOpen;
          syncMenu();
        });
        scene.onkeydown = (event) => {
          if (event.key === "Escape" && menuOpen) {
            menuOpen = false;
            syncMenu();
            trigger.focus();
          }
        };
        scene.querySelectorAll(".vr-menu-panel button").forEach((button, i) =>
          button.addEventListener("click", () => {
            menuIndex = i;
            menuOpen = false;
            syncMenu();
            trigger.focus();
          }),
        );
      }
    });
    syncDrawers();
    syncTabs();
    syncMenu();
    syncWorkspace();
    requestAnimationFrame(measure);
  }
  function selectHash() {
    const key = location.hash.slice(1);
    picker.value = Object.hasOwn(descriptions, key) ? key : "drawers";
    render();
  }
  picker.addEventListener("change", () => {
    location.hash = picker.value;
  });
  window.addEventListener("hashchange", selectHash);
  new ResizeObserver(() => requestAnimationFrame(measure)).observe(
    root.querySelector(".vr-pair"),
  );
  matchMedia("(prefers-color-scheme: dark)").addEventListener(
    "change",
    measure,
  );
  selectHash();
})();
