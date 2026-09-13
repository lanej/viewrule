// Runs inside the page. Selectors and thresholds come from validated configuration.
// Hidden responsive variants don't count. Group checks apply only to declared peers.
/** @param {import("./types.js").Rule[]} rules */
export function inspectPage(rules) {
  /** @type {import("./types.js").Finding[]} */
  const findings = [];
  const density = [];
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
    if (rule.type === "reading-column") {
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
          const matches = [...el.querySelectorAll(group.selector)].filter(
            visible,
          );
          if (!matches.length && !group.optional)
            add(
              rule,
              "Required reading-order group has no visible matches.",
              el,
              group.selector,
              "at least one visible match",
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
              `Overlaps peer ${describe(els[j])}.`,
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
      comparisons,
      consistency,
      evaluations,
    },
  };
}
