// Internal contracts for checkJs. Ajv remains authoritative for runtime input,
// including required fields on each rule type; these declarations emit no code.
export interface Viewport {
  name: string;
  width: number;
  height: number;
}
export interface DetailOptions {
  width: number;
  height: number;
  overlap: number;
  maxTiles: number;
}
export interface ProjectConfig {
  version: 1;
  baseURL: string;
  enforceOnStop: boolean;
  sourcePaths: string[];
  accessibility: boolean;
  requiredDesignRules?: string[];
  storageState?: string;
  timeoutMs?: number;
  detailCapture?: DetailOptions;
  pages: {
    name: string;
    path: string;
    ready: string;
    media?: "screen" | "print";
    textScale?: number;
    viewports?: string[];
  }[];
  viewports: Viewport[];
}
export interface Rule {
  id: string;
  type:
    | "reading-column"
    | "vertical-order"
    | "align"
    | "no-overlap"
    | "no-clip"
    | "visible-count"
    | "max-height"
    | "min-size"
    | "min-font-size"
    | "max-text-gap"
    | "style"
    | "attribute"
    | "consistent"
    | "comparison-set"
    | "context"
    | "region-density";
  selector: string;
  severity: "error" | "warning";
  reason: string;
  pages?: string[];
  viewports?: string[];
  optional?: boolean;
  feedbackId?: string;
  designRules?: string[];
  edge?: "left" | "right" | "top" | "bottom";
  tolerance?: number;
  min?: number;
  max?: number;
  minWidth?: number;
  minHeight?: number;
  items?: string;
  property?: string;
  attribute?: string;
  allowed?: string[];
  keyAttribute?: string;
  properties?: string[];
  attributes?: string[];
  requiredKeys?: string[];
  minVisibleByViewport?: Record<string, number>;
  preserveFrom?: string;
  minFontSize?: number;
  required?: string[];
  region?: string;
  measure?: "boxes" | "text";
  minCoverage?: number;
  maxVerticalGap?: number;
  container?: string;
  maxWidth?: number;
  groups?: { selector: string; optional: boolean }[];
}
export interface Finding {
  rule: string;
  severity: "error" | "warning";
  message: string;
  selector?: string;
  element?: string;
  reason?: string;
  actual?: unknown;
  expected?: unknown;
  box?: { x: number; y: number; width: number; height: number };
  designRules?: string[];
  suggestion?: string;
  evidenceKind?: string;
}
export type DesignPolicy = Awaited<
  ReturnType<typeof import("./design.mjs").readDesignPolicy>
>;
export interface PageResult {
  name: string;
  url: string;
  viewport: Viewport;
  findings: Finding[];
  screenshot?: string;
  details?: Awaited<ReturnType<typeof import("./capture.mjs").captureDetails>>;
  metrics?: ReturnType<typeof import("./checks.mjs").inspectPage>["metrics"];
  coverage?: { layoutRules: string[]; accessibility: boolean };
  accessibilityNeedsReview?: { id: string; help: string; targets: unknown[] }[];
  designCoverage?: {
    id: string;
    title: string;
    href: string;
    status: string;
    checks: string[];
  }[];
}
export interface ReviewReport {
  version: 1;
  id: string;
  project: string;
  createdAt: string;
  fingerprint: string;
  status: "pass" | "fail";
  summary: { errors: number; warnings: number };
  pages: PageResult[];
  designPolicy: DesignPolicy;
  contract: Awaited<ReturnType<typeof import("./contract.mjs").readContract>>;
}
export interface Reference {
  report: ReviewReport;
  note: string;
}
