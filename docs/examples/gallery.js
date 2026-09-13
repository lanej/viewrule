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
      scene.parentElement.querySelector(".vr-measure").textContent = label;
    });
    root.querySelector("#vr-observation").textContent = {
      drawers: "Same 3 parcels · linked drawer expansion",
      diagram: "Same words and diagram · color changes only",
      tabs: "Same 3 destinations · linked tab selection",
      menu: "Same navigation · linked menu controls",
      numbers: "Same quotes and precision · alignment changes only",
      spacing: "Same quotes · bounded width preserves proximity",
    }[key];
  }
  function render() {
    const key = picker.value;
    root.querySelector("#vr-rule").textContent = descriptions[key][0];
    root.querySelector("#vr-check").textContent = descriptions[key][1];
    scenes.forEach((scene, side) => {
      scene.onkeydown = null;
      scene.replaceChildren(
        /** @type {HTMLTemplateElement} */ (
          root.querySelector(`#vr-${key}`)
        ).content.cloneNode(true),
      );
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
