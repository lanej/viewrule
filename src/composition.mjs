// Serialized by Playwright: no module closures, Node APIs, or imported helpers.
/** @param {import("./types.js").Rule[]} rules */
export function inspectComposition(rules) {
  /** @type {import("./types.js").Finding[]} */
  const findings = [];
  /** @type {import("./types.js").CompositionMetric[]} */
  const metrics = [];
  const evaluations = [];
  const viewport = {
    left: 0,
    top: 0,
    right: document.documentElement.clientWidth,
    bottom: innerHeight,
  };
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rect(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    );
  };
  const describe = (el) => (el.id ? `#${el.id}` : el.tagName.toLowerCase());
  const select = (root, selector) =>
    [...root.querySelectorAll(selector)].filter(visible);
  const independent = (els) =>
    els.every((a, i) =>
      els.every((b, j) => i === j || (!a.contains(b) && !b.contains(a))),
    );
  const intersect = (a, b) => ({
    left: Math.max(a.left, b.left),
    right: Math.min(a.right, b.right),
    top: Math.max(a.top, b.top),
    bottom: Math.min(a.bottom, b.bottom),
  });
  const area = (r) =>
    Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
  const visibleBox = (el) => {
    const box = intersect(rect(el), viewport);
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      const s = getComputedStyle(parent),
        r = rect(parent);
      // Axis-aligned client-box clipping. Not painted occlusion or clip-path.
      if (s.overflowX !== "visible") {
        box.left = Math.max(box.left, r.left + parent.clientLeft);
        box.right = Math.min(
          box.right,
          r.left + parent.clientLeft + parent.clientWidth,
        );
      }
      if (s.overflowY !== "visible") {
        box.top = Math.max(box.top, r.top + parent.clientTop);
        box.bottom = Math.min(
          box.bottom,
          r.top + parent.clientTop + parent.clientHeight,
        );
      }
    }
    return box;
  };
  const unionArea = (boxes) => {
    const xs = [...new Set(boxes.flatMap((b) => [b.left, b.right]))].sort(
      (a, b) => a - b,
    );
    let total = 0;
    for (let i = 1; i < xs.length; i++) {
      const spans = boxes
        .filter((b) => b.left < xs[i] && b.right > xs[i - 1])
        .map((b) => [b.top, b.bottom])
        .sort((a, b) => a[0] - b[0]);
      let end = -Infinity,
        height = 0;
      for (const [top, bottom] of spans) {
        height += Math.max(0, bottom - Math.max(top, end));
        end = Math.max(end, bottom);
      }
      total += (xs[i] - xs[i - 1]) * height;
    }
    return total;
  };
  const line = (boxes, axis) => {
    const [start, end, crossStart, crossEnd] =
      axis === "x"
        ? ["left", "right", "top", "bottom"]
        : ["top", "bottom", "left", "right"];
    const sorted = [...boxes].sort((a, b) => a[start] - b[start]);
    if (
      Math.max(...boxes.map((b) => b[crossStart])) >=
      Math.min(...boxes.map((b) => b[crossEnd]))
    )
      return null;
    const gaps = sorted.slice(1).map((b, i) => b[start] - sorted[i][end]);
    // Never flatten wrapped rows or overlapping peers into an apparent rhythm.
    return gaps.some((g) => g < 0) ? null : gaps;
  };
  const envelope = (boxes) => ({
    left: Math.min(...boxes.map((b) => b.left)),
    right: Math.max(...boxes.map((b) => b.right)),
    top: Math.min(...boxes.map((b) => b.top)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  });
  for (const rule of rules) {
    const roots = select(document, rule.selector);
    const evaluation = {
      rule: rule.id,
      matched: roots.length,
      status: roots.length ? "checked" : rule.optional ? "skipped" : "missing",
    };
    evaluations.push(evaluation);
    const add = (message, el, actual, expected, missing = false) => {
      if (missing) evaluation.status = "missing";
      const r = el ? rect(el) : null;
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        selector: rule.selector,
        element: el ? describe(el) : null,
        message,
        reason: rule.reason,
        actual,
        expected,
        box: r
          ? {
              x: r.x + scrollX,
              y: r.y + scrollY,
              width: r.width,
              height: r.height,
            }
          : null,
      });
    };
    if (!roots.length) {
      if (!rule.optional)
        add(
          "Required composition scope has no visible matches.",
          null,
          0,
          "visible scope",
          true,
        );
      continue;
    }
    if (rule.type === "viewport-yield" && roots.length !== 1) {
      add(
        "Viewport yield requires exactly one task region per state.",
        roots[0],
        roots.length,
        1,
        true,
      );
      continue;
    }
    for (const root of roots) {
      const items = select(root, rule.items);
      const record = (values) =>
        metrics.push({
          rule: rule.id,
          type: rule.type,
          element: describe(root),
          ...values,
        });
      if (rule.type === "group-separation") {
        const groups = select(root, rule.groupSelector);
        const members = groups.map((group) => select(group, rule.items));
        if (
          groups.length < 2 ||
          !independent(groups) ||
          members.some((set) => set.length < 2 || !independent(set)) ||
          new Set(members.flat()).size !== items.length ||
          items.some((item) => !members.flat().includes(item))
        ) {
          add(
            "Declare at least two independent groups with at least two visible members each; every selected item must belong to exactly one group.",
            root,
            {
              groups: groups.length,
              members: members.map((set) => set.length),
              items: items.length,
            },
            "complete, disjoint groups",
            true,
          );
          continue;
        }
        const boxes = members.map((set) => set.map(rect));
        const internal = boxes.map((set) => line(set, rule.axis));
        const external = line(boxes.map(envelope), rule.axis);
        if (internal.some((gaps) => gaps === null) || external === null) {
          add(
            "Groups and their members must form nonoverlapping lines on the declared axis.",
            root,
            "wrapped or overlapping geometry",
            rule.axis,
            true,
          );
          continue;
        }
        const maxWithin = Math.max(...internal.flat()),
          minBetween = Math.min(...external);
        record({
          maxWithin,
          minBetween,
          ratio: maxWithin ? minBetween / maxWithin : null,
        });
        if (minBetween <= 0 || minBetween < rule.minRatio * maxWithin)
          add(
            "Between-group separation is not stronger than the declared within-group spacing.",
            root,
            { maxWithin, minBetween },
            { minRatio: rule.minRatio, positiveSeparation: true },
          );
      } else if (rule.type === "region-budget") {
        const region = visibleBox(root),
          regionArea = area(region);
        const boxes = items
          .map((el) => intersect(visibleBox(el), region))
          .filter((b) => area(b) > 0);
        if (!regionArea || !boxes.length) {
          add(
            "A space budget needs a visible task region and visible declared chrome.",
            root,
            { regionArea, items: boxes.length },
            "positive visible evidence",
            true,
          );
          continue;
        }
        const occupiedArea = unionArea(boxes),
          ratio = occupiedArea / regionArea;
        record({ regionArea, occupiedArea, ratio });
        if (ratio > rule.maxRatio)
          add(
            "Declared chrome exceeds its visible-region area budget.",
            root,
            ratio,
            rule.maxRatio,
          );
      } else if (rule.type === "viewport-yield") {
        const rootBox = visibleBox(root),
          keys = [],
          seen = new Set();
        let invalid = false;
        if (!independent(items)) {
          add(
            "Yield identities must describe independent evidence units, not nested containers and their children.",
            root,
            "nested evidence",
            "independent units",
            true,
          );
          record({
            keys,
            valid: false,
            viewportArea: viewport.right * viewport.bottom,
          });
          continue;
        }
        for (const el of items) {
          const r = rect(el),
            clipped = intersect(visibleBox(el), rootBox);
          if (
            !area(clipped) ||
            clipped.left > r.left ||
            clipped.right < r.right ||
            clipped.top > r.top ||
            clipped.bottom < r.bottom
          )
            continue;
          const key = el.getAttribute(rule.keyAttribute)?.trim();
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT),
            sizes = [];
          let node;
          while ((node = walker.nextNode()))
            if (node.textContent.trim() && visible(node.parentElement))
              sizes.push(
                parseFloat(getComputedStyle(node.parentElement).fontSize),
              );
          if (
            !key ||
            !rule.expectedKeys.includes(key) ||
            seen.has(key) ||
            !sizes.length ||
            Math.min(...sizes) < rule.minFontSize
          ) {
            invalid = true;
            add(
              "Yield evidence needs a unique declared identity and visible readable text.",
              el,
              {
                key,
                duplicate: seen.has(key),
                minFontSize: sizes.length ? Math.min(...sizes) : null,
              },
              {
                expectedKeys: rule.expectedKeys,
                minFontSize: rule.minFontSize,
              },
              true,
            );
            continue;
          }
          seen.add(key);
          keys.push(key);
        }
        if (!keys.length) {
          invalid = true;
          add(
            "No complete, readable task evidence is visible for viewport yield.",
            root,
            0,
            "at least one declared identity",
            true,
          );
        }
        record({
          keys,
          valid: !invalid,
          viewportArea: viewport.right * viewport.bottom,
        });
      } else {
        const minItems = rule.type === "spacing-rhythm" ? 3 : 2;
        if (items.length < minItems || !independent(items)) {
          add(
            "Composition measurements need enough independent visible peers in each scope.",
            root,
            items.length,
            minItems,
            true,
          );
          continue;
        }
        const boxes = items.map(rect);
        if (rule.type === "spacing-rhythm") {
          const gaps = line(boxes, rule.axis);
          if (!gaps) {
            add(
              "Spacing rhythm needs one nonoverlapping line; scope wrapped layouts separately.",
              root,
              "wrapped or overlapping peers",
              rule.axis,
              true,
            );
            continue;
          }
          const spread = Math.max(...gaps) - Math.min(...gaps);
          record({ gaps, spread });
          if (spread > rule.maxSpread)
            add(
              "Equivalent peer gaps differ beyond the declared spread.",
              root,
              { gaps, spread },
              rule.maxSpread,
            );
        } else if (rule.type === "peer-size") {
          const sizes = boxes.map((r) =>
            rule.dimension === "area" ? r.width * r.height : r[rule.dimension],
          );
          const ratio = Math.max(...sizes) / Math.min(...sizes);
          record({ sizes, ratio });
          if (ratio > rule.maxRatio)
            add(
              "Declared peers differ beyond their footprint ratio.",
              root,
              { dimension: rule.dimension, sizes, ratio },
              rule.maxRatio,
            );
        }
      }
    }
  }
  return { findings, metrics, evaluations };
}
