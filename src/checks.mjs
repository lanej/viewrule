// Runs inside the page. Selectors and thresholds come from validated configuration.
// Hidden responsive variants don't count. Group checks apply only to declared peers.
/** @param {import("./types.js").Rule[]} rules */
export function inspectPage(rules) {
  /** @type {import("./types.js").Finding[]} */
  const findings = [];
  const density = [];
  /** @type {import("./types.js").CompositionMeasurement[]} */
  const composition = [];
  /** @type {import("./types.js").GrowthMeasurement[]} */
  const growth = [];
  const repeatedMetrics = [],
    evidenceDistances = [],
    markContrasts = [];
  const comparisons = [],
    consistency = [],
    evaluations = [];
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rect(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    );
  };
  const describe = (el) =>
    el.id
      ? `#${el.id}`
      : el.tagName.toLowerCase() +
        (el.classList.length ? "." + [...el.classList].join(".") : "");
  const textNodes = (el) => {
    const nodes = [],
      walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()))
      if (node.textContent.trim() && visible(node.parentElement))
        nodes.push(node);
    return nodes;
  };
  const renderedTextNodes = (el) => {
    const nodes = [],
      walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (
        !node.textContent.trim() ||
        getComputedStyle(node.parentElement).visibility !== "visible"
      )
        continue;
      // A display:contents parent has no box, but its text still renders and
      // inherits its type size. Test the text range and nearest generated box.
      let box = node.parentElement;
      while (box && getComputedStyle(box).display === "contents")
        box = box.parentElement;
      if (!box?.checkVisibility({ checkOpacity: true })) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if ([...range.getClientRects()].some((r) => r.width > 0 && r.height > 0))
        nodes.push(node);
    }
    return nodes;
  };
  const textBounds = (el) => {
    const boxes = textNodes(el).flatMap((node) => {
      const range = document.createRange();
      range.setStart(node, node.textContent.search(/\S/));
      range.setEnd(node, node.textContent.trimEnd().length);
      return [...range.getClientRects()].filter(
        (r) => r.width > 0 && r.height > 0,
      );
    });
    return boxes.length
      ? {
          left: Math.min(...boxes.map((r) => r.left)),
          right: Math.max(...boxes.map((r) => r.right)),
          top: Math.min(...boxes.map((r) => r.top)),
          bottom: Math.max(...boxes.map((r) => r.bottom)),
        }
      : null;
  };
  const solidRGB = (value) => {
    const match = value.match(
      /^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)$/,
    );
    if (!match || (match[4] !== undefined && Number(match[4]) !== 1))
      return null;
    const channels = match.slice(1, 4).map(Number);
    return channels.every((channel) => channel >= 0 && channel <= 255)
      ? channels
      : null;
  };
  const luminance = (rgb) =>
    rgb
      .map((value) => {
        const channel = value / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      })
      .reduce(
        (sum, channel, index) =>
          sum + channel * [0.2126, 0.7152, 0.0722][index],
        0,
      );
  const add = (rule, message, el, actual, expected) =>
    findings.push({
      rule: rule.id,
      severity: rule.severity,
      selector: rule.selector,
      element: el ? describe(el) : null,
      message,
      reason: rule.reason,
      actual,
      expected,
      box: el
        ? (() => {
            const r = rect(el);
            return {
              x: r.x + scrollX,
              y: r.y + scrollY,
              width: r.width,
              height: r.height,
            };
          })()
        : null,
    });
  const width = document.documentElement.clientWidth;
  const viewportBounds = { left: 0, right: width, top: 0, bottom: innerHeight };
  const clipBox = (box, bounds) => ({
    left: Math.max(box.left, bounds.left),
    right: Math.min(box.right, bounds.right),
    top: Math.max(box.top, bounds.top),
    bottom: Math.min(box.bottom, bounds.bottom),
  });
  const boxArea = (box) =>
    Math.max(0, box.right - box.left) * Math.max(0, box.bottom - box.top);
  const inside = (box, bounds) =>
    box.left >= bounds.left &&
    box.right <= bounds.right &&
    box.top >= bounds.top &&
    box.bottom <= bounds.bottom;
  const hasBoxTransform = (el) => {
    for (let current = el; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.display === "contents") continue;
      if (
        Number(style.zoom) !== 1 ||
        style.perspective !== "none" ||
        (style.scale !== "none" &&
          style.scale.split(" ").some((value) => Number(value) !== 1)) ||
        (style.rotate !== "none" &&
          !/(?:^| )0(?:deg|rad|grad|turn)$/.test(style.rotate))
      )
        return true;
      if (style.transform !== "none") {
        const matrix = new DOMMatrix(style.transform);
        if (
          [matrix.m11, matrix.m22, matrix.m33, matrix.m44].some(
            (value) => value !== 1,
          ) ||
          [
            matrix.m12,
            matrix.m13,
            matrix.m14,
            matrix.m21,
            matrix.m23,
            matrix.m24,
            matrix.m31,
            matrix.m32,
            matrix.m34,
          ].some((value) => value !== 0)
        )
          return true;
      }
    }
    return false;
  };
  const overflowBounds = (el, style) => {
    const bounds = rect(el),
      number = (value) => parseFloat(value) || 0,
      borderLeft = number(style.borderLeftWidth),
      borderRight = number(style.borderRightWidth),
      borderTop = number(style.borderTopWidth),
      borderBottom = number(style.borderBottomWidth);
    // clientWidth/Height round to integers. Recover fractional padding edges
    // from the rendered box; use client sizes only for scrollbar allocation.
    const layoutWidth =
      number(style.width) +
      (style.boxSizing === "border-box"
        ? 0
        : borderLeft +
          borderRight +
          number(style.paddingLeft) +
          number(style.paddingRight));
    const layoutHeight =
      number(style.height) +
      (style.boxSizing === "border-box"
        ? 0
        : borderTop +
          borderBottom +
          number(style.paddingTop) +
          number(style.paddingBottom));
    // CSSOM rounds serialized sizes. Preserve scale 1 for ordinary boxes and
    // pure translations instead of inferring a transform from that rounding.
    const transformed = hasBoxTransform(el);
    const scale = (rendered, layout) =>
      transformed && layout > 0 ? rendered / layout : 1;
    const scaleX = scale(bounds.width, layoutWidth),
      scaleY = scale(bounds.height, layoutHeight),
      scrollbarX = Math.max(
        0,
        Math.round(layoutWidth - borderLeft - borderRight) - el.clientWidth,
      ),
      scrollbarY = Math.max(
        0,
        Math.round(layoutHeight - borderTop - borderBottom) - el.clientHeight,
      ),
      leftScrollbar = Math.max(0, el.clientLeft - Math.round(borderLeft));
    return {
      left: bounds.left + (borderLeft + leftScrollbar) * scaleX,
      right: bounds.right - (borderRight + scrollbarX - leftScrollbar) * scaleX,
      top: bounds.top + borderTop * scaleY,
      bottom: bounds.bottom - (borderBottom + scrollbarY) * scaleY,
    };
  };
  const positionedContainer = (el, fixed) => {
    let candidate = el.offsetParent;
    // offsetParent can stop at an effective-zoom boundary that does not
    // establish a containing block. Continue past those plain static boxes.
    while (candidate) {
      const style = getComputedStyle(candidate);
      if (
        (!fixed && style.position !== "static") ||
        [
          "transform",
          "translate",
          "rotate",
          "scale",
          "perspective",
          "filter",
          "backdropFilter",
        ].some((property) => style[property] !== "none") ||
        /\b(layout|paint|strict|content)\b/.test(style.contain) ||
        /\b(transform|translate|rotate|scale|perspective|filter|backdrop-filter|contain)\b/.test(
          style.willChange,
        ) ||
        style.contentVisibility === "auto"
      )
        return candidate;
      candidate = candidate.offsetParent;
    }
    return null;
  };
  const unclipped = (box, subject, includeSelf = false) => {
    let containingBlock = null;
    for (let el = subject; el; el = el.parentElement) {
      // Out-of-flow content bypasses overflow ancestors between it and its
      // containing block. offsetParent supplies Chromium's actual boundary,
      // including transformed containing blocks for fixed-position content.
      if (containingBlock && el !== containingBlock) continue;
      containingBlock = null;
      const style = getComputedStyle(el);
      if (
        (includeSelf || el !== subject) &&
        style.display !== "contents" &&
        (style.overflowX !== "visible" || style.overflowY !== "visible")
      ) {
        const bounds = overflowBounds(el, style);
        if (
          (style.overflowX !== "visible" &&
            (box.left < bounds.left || box.right > bounds.right)) ||
          (style.overflowY !== "visible" &&
            (box.top < bounds.top || box.bottom > bounds.bottom))
        )
          return false;
      }
      if (
        el instanceof HTMLElement &&
        style.display !== "contents" &&
        ["absolute", "fixed"].includes(style.position)
      ) {
        containingBlock = positionedContainer(el, style.position === "fixed");
        // A null containing block is the viewport, checked by inside().
        if (!containingBlock) return true;
      }
    }
    return true;
  };
  const unionArea = (rectangles) => {
    const boxes = rectangles.filter((box) => boxArea(box) > 0);
    const xs = [...new Set(boxes.flatMap((box) => [box.left, box.right]))].sort(
      (a, b) => a - b,
    );
    let area = 0;
    for (let i = 1; i < xs.length; i++) {
      let length = 0,
        end = -Infinity;
      const intervals = boxes
        .filter((box) => box.left < xs[i] && box.right > xs[i - 1])
        .map((box) => [box.top, box.bottom])
        .sort((a, b) => a[0] - b[0]);
      for (const [a, b] of intervals) {
        length += Math.max(0, b - Math.max(a, end));
        end = Math.max(end, b);
      }
      area += (xs[i] - xs[i - 1]) * length;
    }
    return area;
  };
  const variation = (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      values.length;
    return {
      mean,
      coefficientOfVariation: mean ? Math.sqrt(variance) / mean : 0,
    };
  };
  const compositionTypes = [
    "alignment-residual",
    "gap-variance",
    "peer-footprint",
    "chrome-allocation",
  ];
  const overflow =
    Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    ) - width;
  if (overflow > 1)
    add(
      {
        id: "page-overflow",
        severity: "error",
        selector: "html",
        reason:
          "Keep page content within the viewport; use intentional local scroll regions.",
      },
      `Page overflows horizontally by ${overflow}px.`,
      null,
      overflow,
      0,
    );
  let evaluated = 0;
  for (const rule of rules) {
    const els = [...document.querySelectorAll(rule.selector)].filter(visible);
    evaluated++;
    evaluations.push({
      rule: rule.id,
      matched: els.length,
      status: els.length ? "checked" : rule.optional ? "skipped" : "missing",
    });
    if (!els.length) {
      if (!rule.optional && compositionTypes.includes(rule.type)) {
        evaluations.at(-1).status = "unassessed";
        composition.push({
          rule: rule.id,
          type: rule.type,
          element: null,
          status: "unassessed",
          valid: false,
          problems: ["Required selector has no visible matches."],
        });
      }
      if (!rule.optional && rule.type === "viewport-growth-yield") {
        evaluations.at(-1).status = "unassessed";
        growth.push({
          rule: rule.id,
          element: null,
          status: "unassessed",
          valid: false,
          width: 0,
          height: 0,
          area: 0,
          keys: [],
          items: [],
          problems: ["Required selector has no visible matches."],
        });
      }
      if (!rule.optional)
        add(
          rule,
          "Required selector has no visible matches.",
          null,
          0,
          "at least one visible match",
        );
      continue;
    }
    if (compositionTypes.includes(rule.type)) {
      for (const el of els) {
        const items = [...el.querySelectorAll(rule.items)].filter(
          (item) => visible(item) && item.closest(rule.selector) === el,
        );
        const problems = [];
        /** @type {import("./types.js").CompositionMeasurement} */
        const observation = {
          rule: rule.id,
          type: rule.type,
          element: describe(el),
          status: "measured",
          valid: true,
          count: items.length,
          problems,
        };
        composition.push(observation);
        const minimum =
          rule.type === "gap-variance"
            ? 3
            : rule.type === "chrome-allocation"
              ? 1
              : 2;
        if (items.length < minimum)
          problems.push(
            `Measurement needs at least ${minimum} visible selected items.`,
          );
        if (
          rule.type !== "chrome-allocation" &&
          items.some((item, i) =>
            items.some((other, j) => i !== j && item.contains(other)),
          )
        )
          problems.push("Declared peers must not contain one another.");
        if (rule.type === "chrome-allocation" && els.length !== 1)
          problems.push(
            "Chrome allocation needs exactly one visible usable region.",
          );
        if (!problems.length && rule.type === "alignment-residual") {
          const anchors = items.map((item) => {
            const box = rect(item);
            return rule.edge === "center-x"
              ? box.left + box.width / 2
              : rule.edge === "center-y"
                ? box.top + box.height / 2
                : box[rule.edge];
          });
          const sorted = [...anchors].sort((a, b) => a - b),
            middle = Math.floor(sorted.length / 2),
            median =
              sorted.length % 2
                ? sorted[middle]
                : (sorted[middle - 1] + sorted[middle]) / 2,
            maxResidual = Math.max(
              ...anchors.map((anchor) => Math.abs(anchor - median)),
            );
          Object.assign(observation, {
            edge: rule.edge,
            anchors,
            median,
            maxResidual,
          });
          if (maxResidual > rule.maxResidual)
            add(
              rule,
              "Declared peer anchors exceed the configured residual from their median.",
              el,
              observation,
              { maxResidual: rule.maxResidual, unit: "CSS px" },
            );
        } else if (!problems.length && rule.type === "gap-variance") {
          const horizontal = rule.axis === "x";
          const boxes = items
            .map(rect)
            .sort((a, b) => (horizontal ? a.left - b.left : a.top - b.top));
          const gaps = boxes
            .slice(1)
            .map((box, i) =>
              horizontal
                ? box.left - boxes[i].right
                : box.top - boxes[i].bottom,
            );
          Object.assign(observation, { axis: rule.axis, gaps });
          if (gaps.some((gap) => gap < 0))
            problems.push("Declared peers overlap on the measured axis.");
          const crossStart = Math.max(
            ...boxes.map((box) => (horizontal ? box.top : box.left)),
          );
          const crossEnd = Math.min(
            ...boxes.map((box) => (horizontal ? box.bottom : box.right)),
          );
          if (crossEnd <= crossStart)
            problems.push(
              "Gap variance needs a single shared row or column band.",
            );
          if (!problems.length) {
            Object.assign(observation, variation(gaps));
            if (
              observation.coefficientOfVariation >
              rule.maxCoefficientOfVariation
            )
              add(
                rule,
                "Peer gaps exceed the configured population coefficient of variation.",
                el,
                observation,
                { maxCoefficientOfVariation: rule.maxCoefficientOfVariation },
              );
          }
        } else if (!problems.length && rule.type === "peer-footprint") {
          const values = items.map((item) =>
            rule.measure === "area"
              ? boxArea(rect(item))
              : parseFloat(getComputedStyle(item).fontSize),
          );
          Object.assign(observation, { measure: rule.measure, values });
          if (values.some((value) => !Number.isFinite(value) || value <= 0))
            problems.push(
              "Peer footprint needs positive finite values for every peer.",
            );
          else {
            Object.assign(observation, variation(values));
            if (
              observation.coefficientOfVariation >
              rule.maxCoefficientOfVariation
            )
              add(
                rule,
                "Peer visual-footprint proxy exceeds the configured population coefficient of variation.",
                el,
                observation,
                { maxCoefficientOfVariation: rule.maxCoefficientOfVariation },
              );
          }
        } else if (!problems.length && rule.type === "chrome-allocation") {
          const bounds = clipBox(rect(el), viewportBounds),
            regionArea = boxArea(bounds),
            chromeArea = unionArea(
              items.map((item) => clipBox(rect(item), bounds)),
            );
          Object.assign(observation, { regionArea, chromeArea });
          if (!regionArea)
            problems.push("Usable region must intersect the initial viewport.");
          else {
            observation.ratio = chromeArea / regionArea;
            if (observation.ratio > rule.maxRatio)
              add(
                rule,
                "Declared chrome consumes more than its configured share of the usable region.",
                el,
                observation,
                { maxRatio: rule.maxRatio },
              );
          }
        }
        if (problems.length) {
          observation.valid = false;
          observation.status = "unassessed";
          evaluations.at(-1).status = "unassessed";
          add(
            rule,
            `Composition measurement is unassessed: ${problems.join(" ")}`,
            el,
            observation,
            "supported geometry and sufficient declared peers",
          );
        }
      }
    } else if (rule.type === "viewport-growth-yield") {
      const el = els.length === 1 ? els[0] : null,
        bounds = el ? clipBox(rect(el), viewportBounds) : viewportBounds;
      /** @type {import("./types.js").GrowthMeasurement} */
      const observation = {
        rule: rule.id,
        element: el ? describe(el) : null,
        status: "measured",
        valid: true,
        width: el ? Math.max(0, bounds.right - bounds.left) : 0,
        height: el ? Math.max(0, bounds.bottom - bounds.top) : 0,
        area: el ? boxArea(bounds) : 0,
        keys: [],
        items: [],
        problems: [],
      };
      growth.push(observation);
      if (!el)
        observation.problems.push(
          "Viewport-growth yield needs exactly one visible usable region.",
        );
      else {
        if (!observation.area)
          observation.problems.push(
            "Usable region must intersect the initial viewport.",
          );
        const items = [...el.querySelectorAll(rule.items)].filter(visible);
        if (!items.length)
          observation.problems.push(
            "Evidence selector needs visible selected items.",
          );
        const counts = new Map();
        for (const item of items) {
          const key = item.getAttribute(rule.keyAttribute)?.trim() || null,
            reasons = [],
            nodes = renderedTextNodes(item),
            sizes = nodes.map((node) =>
              parseFloat(getComputedStyle(node.parentElement).fontSize),
            ),
            minFontSize = sizes.length ? Math.min(...sizes) : null;
          if (!key)
            observation.problems.push(
              `Evidence ${describe(item)} has no stable identity in ${rule.keyAttribute}.`,
            );
          else {
            counts.set(key, (counts.get(key) || 0) + 1);
            if (rule.finiteKeys && !rule.finiteKeys.includes(key))
              observation.problems.push(
                `Evidence identity ${key} is outside finiteKeys.`,
              );
          }
          if (!inside(rect(item), bounds))
            reasons.push("outside usable region or viewport");
          if (!unclipped(rect(item), item))
            reasons.push("clipped by ancestor overflow");
          if (!nodes.length) reasons.push("no visible text");
          if (
            nodes.length &&
            (!Number.isFinite(minFontSize) || minFontSize < rule.minFontSize)
          )
            reasons.push("below readable type size");
          for (const node of nodes) {
            const range = document.createRange();
            range.setStart(node, node.textContent.search(/\S/));
            range.setEnd(node, node.textContent.trimEnd().length);
            if (
              [...range.getClientRects()].some(
                (box) =>
                  box.width > 0 &&
                  box.height > 0 &&
                  (!inside(box, bounds) ||
                    !unclipped(box, node.parentElement, true)),
              )
            ) {
              reasons.push(
                "text outside usable region, viewport, or overflow clip",
              );
              break;
            }
          }
          if (!key) reasons.push("missing identity");
          if (key && rule.finiteKeys && !rule.finiteKeys.includes(key))
            reasons.push("outside finiteKeys");
          observation.items.push({
            element: describe(item),
            key,
            eligible: !reasons.length,
            reasons,
            minFontSize,
          });
        }
        for (const [key, count] of counts)
          if (count > 1) {
            observation.problems.push(
              `Evidence identity ${key} appears ${count} times among visible selected items.`,
            );
            for (const item of observation.items.filter(
              (item) => item.key === key,
            )) {
              item.eligible = false;
              item.reasons.push("duplicate identity");
            }
          }
        observation.keys = observation.items
          .filter((item) => item.eligible)
          .map((item) => item.key);
        if (!observation.keys.length)
          observation.problems.push(
            "Growth measurement needs at least one fully visible, readable evidence identity.",
          );
      }
      if (observation.problems.length) {
        observation.valid = false;
        observation.status = "unassessed";
        evaluations.at(-1).status = "unassessed";
        add(
          rule,
          `Viewport-growth observation is unassessed: ${observation.problems.join(" ")}`,
          el,
          observation,
          "one usable region with uniquely identified evidence",
        );
      }
    } else if (rule.type === "within-bounds") {
      for (const el of els) {
        const container = el.parentElement?.closest(rule.container);
        if (!container || !visible(container)) {
          add(
            rule,
            "Content needs a visible containing ancestor.",
            el,
            null,
            rule.container,
          );
          continue;
        }
        const bounds = rect(container),
          box = rect(el);
        const excess = {
          left: Math.max(0, bounds.left - box.left),
          right: Math.max(0, box.right - bounds.right),
          top: Math.max(0, bounds.top - box.top),
          bottom: Math.max(0, box.bottom - bounds.bottom),
        };
        if (Object.values(excess).some((value) => value > rule.tolerance)) {
          add(
            rule,
            "Content extends beyond its declared container.",
            el,
            excess,
            { maximumExcess: rule.tolerance, container: rule.container },
          );
        }
      }
    } else if (rule.type === "required-elements") {
      for (const el of els)
        for (const selector of rule.required) {
          const selected = [...el.querySelectorAll(selector)];
          const shown = selected.filter(visible);
          if (!selected.length || shown.length !== selected.length)
            add(
              rule,
              "Required component elements are absent or hidden.",
              el,
              { selector, selected: selected.length, visible: shown.length },
              { minSelected: 1, visible: selected.length || 1 },
            );
        }
    } else if (rule.type === "relative-position") {
      for (const el of els) {
        const from = [...el.querySelectorAll(rule.from)];
        const to = [...el.querySelectorAll(rule.to)];
        if (
          from.length !== 1 ||
          to.length !== 1 ||
          !visible(from[0]) ||
          !visible(to[0])
        ) {
          add(
            rule,
            "A relationship needs exactly one visible element at each end within its component.",
            el,
            {
              from: from.length,
              to: to.length,
              visibleFrom: from.filter(visible).length,
              visibleTo: to.filter(visible).length,
            },
            { from: 1, to: 1, visibleFrom: 1, visibleTo: 1 },
          );
          continue;
        }
        if (from[0].contains(to[0]) || to[0].contains(from[0])) {
          add(
            rule,
            "A relationship needs distinct peers, not the same element or nested boxes.",
            el,
            "same or nested elements",
            "distinct peers",
          );
          continue;
        }
        const a = rect(from[0]),
          b = rect(to[0]);
        const horizontal = rule.relation === "left-of";
        const gap = horizontal ? b.left - a.right : b.top - a.bottom;
        const crossOverlap = horizontal
          ? Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          : Math.min(a.right, b.right) - Math.max(a.left, b.left);
        if (
          crossOverlap <= 0 ||
          gap < rule.minGap - rule.tolerance ||
          gap > rule.maxGap + rule.tolerance
        )
          add(
            rule,
            "Component peers must retain their declared direction, shared band, and bounded gap.",
            to[0],
            { relation: rule.relation, gap, crossOverlap },
            {
              relation: rule.relation,
              minGap: rule.minGap,
              maxGap: rule.maxGap,
              tolerance: rule.tolerance,
              crossOverlap: "> 0",
            },
          );
      }
    } else if (rule.type === "reading-column") {
      for (const el of els) {
        const container = el.parentElement?.closest(rule.container);
        if (!container || !visible(container)) {
          add(
            rule,
            "Reading column needs a visible containing ancestor.",
            el,
            null,
            rule.container,
          );
          continue;
        }
        const bounds = rect(container),
          box = rect(el);
        const expectedWidth = Math.min(bounds.width, rule.maxWidth);
        const offset =
          box.left + box.width / 2 - (bounds.left + bounds.width / 2);
        if (
          Math.abs(box.width - expectedWidth) > rule.tolerance ||
          Math.abs(offset) > rule.tolerance
        )
          add(
            rule,
            "Content must fill the centered, bounded reading column.",
            el,
            { width: box.width, centerOffset: offset },
            {
              width: expectedWidth,
              centerOffset: 0,
              tolerance: rule.tolerance,
            },
          );
      }
    } else if (rule.type === "vertical-order") {
      for (const el of els) {
        const ordered = [];
        for (const group of rule.groups) {
          const selected = [...el.querySelectorAll(group.selector)];
          const matches = selected.filter(visible);
          if (!matches.length && !group.optional)
            add(
              rule,
              "Required reading-order group has no visible matches.",
              el,
              group.selector,
              "at least one visible match",
            );
          if (!group.optional && matches.length < selected.length)
            add(
              rule,
              "Required reading-order content is hidden.",
              el,
              {
                selector: group.selector,
                selected: selected.length,
                visible: matches.length,
              },
              { visible: selected.length },
            );
          ordered.push(...matches);
        }
        if (!ordered.length) {
          add(
            rule,
            "Reading order has no visible evidence.",
            el,
            0,
            "at least one visible group",
          );
          continue;
        }
        for (let i = 1; i < ordered.length; i++) {
          const previous = ordered[i - 1],
            current = ordered[i];
          const previousBox = rect(previous),
            currentBox = rect(current);
          const domOrder =
            previous !== current &&
            !previous.contains(current) &&
            !current.contains(previous) &&
            !!(
              previous.compareDocumentPosition(current) &
              Node.DOCUMENT_POSITION_FOLLOWING
            );
          if (!domOrder || previousBox.bottom > currentBox.top + rule.tolerance)
            add(
              rule,
              "Declared groups must follow DOM and top-to-bottom reading order.",
              current,
              {
                previous: describe(previous),
                previousBottom: previousBox.bottom,
                top: currentBox.top,
                domOrder,
              },
              {
                after: describe(previous),
                minTop: previousBox.bottom - rule.tolerance,
                domOrder: true,
              },
            );
        }
      }
    } else if (rule.type === "comparison-set" || rule.type === "consistent") {
      const items = [];
      for (const el of els) {
        const key = el.getAttribute(rule.keyAttribute)?.trim();
        if (!key) {
          add(
            rule,
            `Missing stable identity: ${rule.keyAttribute}.`,
            el,
            null,
            "nonempty identity",
          );
          continue;
        }
        if (rule.type === "consistent") {
          const values = {};
          for (const property of rule.properties)
            values[`css:${property}`] = getComputedStyle(el)
              .getPropertyValue(property)
              .trim();
          for (const attribute of rule.attributes)
            values[`attr:${attribute}`] =
              el.getAttribute(attribute)?.trim() ?? "";
          if (rule.compareSVG) {
            // Compare authored SVG structure, not a self-reported symbol label.
            // Ignore formatting, comments and accessibility descriptions; this
            // remains a DOM comparison, not proof of equivalent painted output.
            const svgNode = (node) => {
              if (node.nodeType === Node.TEXT_NODE)
                return node.textContent.trim() ? node.textContent : null;
              if (
                node.nodeType !== Node.ELEMENT_NODE ||
                ["title", "desc", "metadata"].includes(node.localName)
              )
                return null;
              return [
                node.localName,
                [...node.attributes]
                  .map((attr) => [attr.name, attr.value])
                  .sort((a, b) => a[0].localeCompare(b[0])),
                [...node.childNodes]
                  .map(svgNode)
                  .filter((child) => child !== null),
              ];
            };
            const content = [...el.childNodes]
              .map(svgNode)
              .filter((child) => child !== null);
            if (
              el.namespaceURI !== "http://www.w3.org/2000/svg" ||
              el.localName !== "svg" ||
              !content.length
            )
              add(
                rule,
                "SVG comparison needs a visible inline SVG with nonempty content.",
                el,
                el.localName,
                "inline svg with content",
              );
            else values["svg:content"] = JSON.stringify(content);
          }
          if (Object.values(values).some((value) => !value))
            add(
              rule,
              `Incomplete comparison metadata for ${key}.`,
              el,
              values,
              "nonempty declared properties and attributes",
            );
          items.push({ key, values });
        } else {
          const r = rect(el);
          let fits =
            r.top >= 0 &&
            r.left >= 0 &&
            r.bottom <= innerHeight &&
            r.right <= width;
          for (
            let ancestor = el.parentElement;
            fits && ancestor;
            ancestor = ancestor.parentElement
          ) {
            const style = getComputedStyle(ancestor),
              a = rect(ancestor);
            const left = a.left + ancestor.clientLeft,
              top = a.top + ancestor.clientTop;
            if (
              style.overflowX !== "visible" &&
              (r.left < left - 1 || r.right > left + ancestor.clientWidth + 1)
            )
              fits = false;
            if (
              style.overflowY !== "visible" &&
              (r.top < top - 1 || r.bottom > top + ancestor.clientHeight + 1)
            )
              fits = false;
          }
          if (fits) {
            items.push(key);
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            const sizes = [];
            let textNode;
            while ((textNode = walker.nextNode()))
              if (
                textNode.textContent.trim() &&
                visible(textNode.parentElement)
              )
                sizes.push(
                  parseFloat(getComputedStyle(textNode.parentElement).fontSize),
                );
            const size = sizes.length
              ? Math.min(...sizes)
              : parseFloat(getComputedStyle(el).fontSize);
            if (size < rule.minFontSize)
              add(
                rule,
                `${key} is below the configured readable type size.`,
                el,
                size,
                rule.minFontSize,
              );
          }
        }
      }
      if (rule.type === "consistent")
        consistency.push({ rule: rule.id, items });
      else {
        const keys = [...new Set(items)];
        comparisons.push({ rule: rule.id, keys });
        const missing = rule.requiredKeys.filter((key) => !keys.includes(key));
        if (missing.length)
          add(
            rule,
            "Critical comparisons are not visible together.",
            null,
            missing,
            rule.requiredKeys,
          );
      }
    } else if (rule.type === "min-font-size") {
      const parents = new Set(
        els.flatMap((el) => textNodes(el).map((node) => node.parentElement)),
      );
      if (!parents.size) {
        evaluations.at(-1).status = "missing";
        add(
          rule,
          "No visible text was available to measure.",
          els[0],
          0,
          "visible text",
        );
      }
      for (const el of parents) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < rule.min)
          add(
            rule,
            "Visible text is below the configured readable type size.",
            el,
            size,
            rule.min,
          );
      }
    } else if (rule.type === "max-text-gap") {
      for (const el of els) {
        const items = [...el.querySelectorAll(rule.items)]
          .filter(visible)
          .map((item) => ({ item, box: textBounds(item) }))
          .filter((entry) => entry.box)
          .sort((a, b) => a.box.left - b.box.left);
        if (items.length < 2) {
          add(
            rule,
            "Text-distance checks need at least two nonempty text items in each row.",
            el,
            items.length,
            2,
          );
          continue;
        }
        for (let i = 1; i < items.length; i++) {
          const a = items[i - 1].box,
            b = items[i].box;
          if (Math.min(a.bottom, b.bottom) <= Math.max(a.top, b.top)) {
            add(
              rule,
              "Declared text items do not share a horizontal reading band; scope or reflow the comparison row.",
              el,
              "stacked items",
              "one comparison row",
            );
            continue;
          }
          const gap = Math.max(0, b.left - a.right);
          if (gap > rule.max)
            add(
              rule,
              `Adjacent text values are ${gap.toFixed(1)}px apart.`,
              items[i].item,
              gap,
              rule.max,
            );
        }
      }
    } else if (rule.type === "repeated-metric") {
      for (const el of els) {
        // A nested decision surface owns its own metrics.
        const items = [...el.querySelectorAll(rule.items)].filter(
          (item) => visible(item) && item.closest(rule.selector) === el,
        );
        const counts = new Map();
        for (const item of items) {
          const key = item.getAttribute(rule.keyAttribute)?.trim();
          if (!key || !textBounds(item)) {
            evaluations.at(-1).status = "missing";
            add(
              rule,
              "Metric needs a stable identity and visible text.",
              item,
              key || null,
              rule.keyAttribute,
            );
            continue;
          }
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        for (const key of rule.requiredKeys) {
          if (!counts.has(key)) {
            evaluations.at(-1).status = "missing";
            add(
              rule,
              "Required metric is missing from this decision surface.",
              el,
              key,
              "visible metric identity",
            );
          }
        }
        for (const [key, count] of counts) {
          if (count > rule.maxOccurrences)
            add(
              rule,
              "Metric identity repeats within the same decision surface.",
              el,
              { key, count },
              { maxOccurrences: rule.maxOccurrences },
            );
        }
        repeatedMetrics.push({
          rule: rule.id,
          surface: describe(el),
          counts: Object.fromEntries(counts),
        });
      }
    } else if (rule.type === "evidence-proximity") {
      for (const el of els) {
        const anchors = [rule.evidence, rule.decision].map((selector) =>
          [...el.querySelectorAll(selector)].filter(
            (item) => visible(item) && item.closest(rule.selector) === el,
          ),
        );
        const boxes = anchors.map((items) =>
          items.length === 1 ? textBounds(items[0]) : null,
        );
        if (boxes.some((box) => !box)) {
          evaluations.at(-1).status = "missing";
          add(
            rule,
            "Proximity needs exactly one visible, nonempty evidence and decision anchor per surface.",
            el,
            anchors.map((items) => items.length),
            [rule.evidence, rule.decision],
          );
          continue;
        }
        const [a, b] = boxes;
        const horizontalGap = Math.max(0, a.left - b.right, b.left - a.right);
        const verticalGap = Math.max(0, a.top - b.bottom, b.top - a.bottom);
        const distance = Math.hypot(horizontalGap, verticalGap);
        const observation = {
          rule: rule.id,
          surface: describe(el),
          horizontalGap,
          verticalGap,
          distance,
        };
        evidenceDistances.push(observation);
        if (distance > rule.maxDistance)
          add(
            rule,
            "Evidence and decision text are too far apart.",
            anchors[1][0],
            observation,
            { maxDistance: rule.maxDistance },
          );
      }
    } else if (rule.type === "mark-contrast") {
      for (const el of els) {
        const substrate = el.parentElement?.closest(rule.substrate);
        const foreground = getComputedStyle(el).backgroundColor;
        const background = substrate
          ? getComputedStyle(substrate).backgroundColor
          : "";
        const fg = solidRGB(foreground),
          bg = solidRGB(background);
        let unsupported =
          !substrate ||
          !visible(substrate) ||
          !fg ||
          !bg ||
          !(el instanceof HTMLElement) ||
          !(substrate instanceof HTMLElement);
        // Support opaque CSS-background marks on a containing solid background.
        // Reject paint effects instead of calculating a misleading nominal ratio.
        for (let current = el; current; current = current.parentElement) {
          const style = getComputedStyle(current);
          if (
            Number(style.opacity) !== 1 ||
            style.filter !== "none" ||
            style.backdropFilter !== "none" ||
            style.mixBlendMode !== "normal" ||
            style.maskImage !== "none"
          )
            unsupported = true;
          if (
            current === el ||
            current === substrate ||
            (substrate && substrate.contains(current))
          ) {
            if (style.backgroundImage !== "none" || style.boxShadow !== "none")
              unsupported = true;
            if (
              current !== el &&
              current !== substrate &&
              style.backgroundColor !== "rgba(0, 0, 0, 0)"
            )
              unsupported = true;
            for (const pseudo of ["::before", "::after"]) {
              if (
                !["none", "normal"].includes(
                  getComputedStyle(current, pseudo).content,
                )
              )
                unsupported = true;
            }
          }
        }
        if (substrate) {
          const a = rect(el),
            b = rect(substrate);
          if (
            a.left < b.left ||
            a.right > b.right ||
            a.top < b.top ||
            a.bottom > b.bottom
          )
            unsupported = true;
        }
        if (unsupported) {
          evaluations.at(-1).status = "unassessed";
          const observation = {
            rule: rule.id,
            element: describe(el),
            status: "unassessed",
            foreground,
            background,
          };
          markContrasts.push(observation);
          add(
            rule,
            "Mark contrast is unassessed: requires opaque CSS background colors on a containing solid substrate without paint effects.",
            el,
            observation,
            "supported solid paint or human review",
          );
          continue;
        }
        const a = luminance(fg),
          b = luminance(bg);
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const observation = {
          rule: rule.id,
          element: describe(el),
          status: "measured",
          foreground,
          background,
          ratio,
        };
        markContrasts.push(observation);
        if (ratio < rule.minRatio)
          add(
            rule,
            "Mark contrast against the declared solid substrate is too low.",
            el,
            observation,
            { minRatio: rule.minRatio },
          );
      }
    } else if (rule.type === "region-density") {
      const regions =
        rule.region === "viewport"
          ? [document.documentElement]
          : [...document.querySelectorAll(rule.region)].filter(visible);
      if (regions.length !== 1) {
        add(
          rule,
          "Density region must match exactly one visible element.",
          null,
          regions.length,
          1,
        );
        continue;
      }
      const region = regions[0],
        r =
          rule.region === "viewport"
            ? { left: 0, right: width, top: 0, bottom: innerHeight }
            : rect(region);
      const bounds = {
        left: Math.max(0, r.left),
        right: Math.min(width, r.right),
        top: Math.max(0, r.top),
        bottom: Math.min(innerHeight, r.bottom),
      };
      if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
        add(
          rule,
          "Density region is outside the initial viewport.",
          region,
          "offscreen",
          "visible region",
        );
        continue;
      }
      const selected = els.filter((el) => region.contains(el));
      const rectangles = [];
      for (const el of selected) {
        let boxes;
        if (rule.measure === "text") {
          boxes = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            if (!node.textContent.trim() || !visible(node.parentElement))
              continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            boxes.push(...range.getClientRects());
          }
        } else boxes = [rect(el)];
        for (const b of boxes) {
          const clipped = {
            left: Math.max(bounds.left, b.left),
            right: Math.min(bounds.right, b.right),
            top: Math.max(bounds.top, b.top),
            bottom: Math.min(bounds.bottom, b.bottom),
          };
          if (clipped.right > clipped.left && clipped.bottom > clipped.top)
            rectangles.push(clipped);
        }
      }
      const unionLength = (intervals) => {
        let total = 0,
          end = -Infinity;
        for (const [a, b] of intervals.sort((a, b) => a[0] - b[0])) {
          total += Math.max(0, b - Math.max(a, end));
          end = Math.max(end, b);
        }
        return total;
      };
      const xs = [
        ...new Set(rectangles.flatMap((b) => [b.left, b.right])),
      ].sort((a, b) => a - b);
      let area = 0;
      for (let i = 1; i < xs.length; i++)
        area +=
          (xs[i] - xs[i - 1]) *
          unionLength(
            rectangles
              .filter((b) => b.left < xs[i] && b.right > xs[i - 1])
              .map((b) => [b.top, b.bottom]),
          );
      let edge = bounds.top,
        gap = 0;
      for (const b of [...rectangles].sort((a, b) => a.top - b.top)) {
        gap = Math.max(gap, b.top - edge);
        edge = Math.max(edge, b.bottom);
      }
      gap = Math.max(gap, bounds.bottom - edge);
      const regionArea =
        (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
      const coverage = area / regionArea;
      const count = selected.filter((el) => {
        const b = rect(el);
        return (
          b.right > bounds.left &&
          b.left < bounds.right &&
          b.bottom > bounds.top &&
          b.top < bounds.bottom
        );
      }).length;
      density.push({
        rule: rule.id,
        region: rule.region,
        measure: rule.measure,
        coverage,
        selectedElements: count,
        elementsPer100kPixels: (count / regionArea) * 100000,
        largestVerticalGap: gap,
        regionArea,
        coveredArea: area,
      });
      if (coverage < rule.minCoverage)
        add(
          rule,
          `Selected content covers ${(coverage * 100).toFixed(1)}% of the visible region.`,
          region,
          coverage,
          rule.minCoverage,
        );
      if (gap > rule.maxVerticalGap)
        add(
          rule,
          `Largest empty vertical band is ${gap.toFixed(1)}px.`,
          region,
          gap,
          rule.maxVerticalGap,
        );
    } else if (rule.type === "align") {
      if (els.length < 2) {
        add(
          rule,
          "Alignment needs at least two visible peers.",
          els[0],
          els.length,
          2,
        );
        continue;
      }
      const values = els.map((el) => rect(el)[rule.edge]);
      const spread = Math.max(...values) - Math.min(...values);
      if (spread > rule.tolerance)
        add(
          rule,
          `${rule.edge} edges differ by ${spread.toFixed(1)}px.`,
          els[values.indexOf(Math.max(...values))],
          spread,
          rule.tolerance,
        );
    } else if (rule.type === "visible-count") {
      const n = els.filter((el) => {
        const r = rect(el);
        return (
          r.top >= 0 &&
          r.bottom <= innerHeight &&
          r.left >= 0 &&
          r.right <= width
        );
      }).length;
      if (n < rule.min)
        add(
          rule,
          `Only ${n} complete items fit in the initial viewport.`,
          els[0],
          n,
          rule.min,
        );
    } else if (rule.type === "no-overlap") {
      for (let i = 0; i < els.length; i++)
        for (let j = i + 1; j < els.length; j++) {
          if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
          const a = rect(els[i]),
            b = rect(els[j]);
          if (
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
          )
            add(
              rule,
              `Content ${JSON.stringify(els[i].textContent.trim().slice(0, 120))} overlaps peer ${describe(els[j])} ${JSON.stringify(els[j].textContent.trim().slice(0, 120))}.`,
              els[i],
              "overlap",
              "no overlap",
            );
        }
    } else
      for (const el of els) {
        if (rule.type === "min-size") {
          const { width, height } = rect(el);
          if (width < rule.minWidth || height < rule.minHeight)
            add(
              rule,
              "Control bounds are below the configured minimum size.",
              el,
              { width, height },
              { width: rule.minWidth, height: rule.minHeight },
            );
        }
        if (rule.type === "max-height" && rect(el).height > rule.max)
          add(
            rule,
            `Height is ${rect(el).height}px.`,
            el,
            rect(el).height,
            rule.max,
          );
        if (rule.type === "style") {
          const value = getComputedStyle(el)
            .getPropertyValue(rule.property)
            .trim();
          if (!rule.allowed.includes(value))
            add(
              rule,
              `Unapproved ${rule.property}: ${value}.`,
              el,
              value,
              rule.allowed,
            );
        }
        if (rule.type === "attribute") {
          const value = el.getAttribute(rule.attribute);
          if (!rule.allowed.includes(value))
            add(
              rule,
              `Unapproved or missing ${rule.attribute}.`,
              el,
              value,
              rule.allowed,
            );
        }
        if (rule.type === "context")
          for (const selector of rule.required) {
            const matches = [...el.querySelectorAll(selector)].filter(visible);
            if (!matches.some((x) => x.textContent.trim()))
              add(
                rule,
                `Missing visible, nonempty context: ${selector}.`,
                el,
                selector,
                "visible nonempty context",
              );
          }
        if (rule.type === "no-clip") {
          const style = getComputedStyle(el);
          const clippedX =
            ["hidden", "clip"].includes(style.overflowX) &&
            el.scrollWidth > el.clientWidth + 1;
          const clippedY =
            ["hidden", "clip"].includes(style.overflowY) &&
            el.scrollHeight > el.clientHeight + 1;
          if (clippedX || clippedY)
            add(
              rule,
              "Content is clipped inside this element.",
              el,
              {
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
              },
              "no hidden overflow",
            );
        }
      }
  }
  return {
    findings,
    metrics: {
      viewportWidth: width,
      viewportHeight: innerHeight,
      pageHeight: document.documentElement.scrollHeight,
      evaluatedRules: evaluated,
      density,
      composition,
      growth,
      repeatedMetrics,
      evidenceDistances,
      markContrasts,
      comparisons,
      consistency,
      evaluations,
    },
  };
}
