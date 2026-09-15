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
export interface ProjectDocument {
  path: string;
  role: "design" | "style" | "reference";
  sha256: string;
  content: string;
  headings: { id: string; line: number; title: string }[];
}
export interface Checkpoint {
  name: string;
  setup: string;
}
export interface SourceCheckProvider {
  id: string;
  command: string[];
  authority: "advisory" | "blocking";
  enabled?: boolean;
  version?: string;
  cwd?: string;
  severityMap?: Record<string, "error" | "warning">;
}
export interface ProjectConfig {
  version: 1;
  baseURL: string;
  enforceOnStop: boolean;
  sourcePaths: string[];
  accessibility: boolean;
  projectDocuments?: string[];
  requiredDesignRules?: string[];
  sourceChecks?: SourceCheckProvider[];
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
    checkpoints?: Checkpoint[];
  }[];
  viewports: Viewport[];
}
export interface Rule {
  id: string;
  type:
    | "within-bounds"
    | "required-elements"
    | "relative-position"
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
    | "region-density"
    | "repeated-metric"
    | "evidence-proximity"
    | "mark-contrast";
  selector: string;
  severity: "error" | "warning";
  reason: string;
  pages?: string[];
  viewports?: string[];
  optional?: boolean;
  feedbackId?: string;
  designRules?: string[];
  sources?: string[];
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
  acrossPages?: boolean;
  compareSVG?: boolean;
  from?: string;
  to?: string;
  relation?: "left-of" | "above";
  minGap?: number;
  maxGap?: number;
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
  maxOccurrences?: number;
  evidence?: string;
  decision?: string;
  maxDistance?: number;
  substrate?: string;
  minRatio?: number;
  groups?: { selector: string; optional: boolean }[];
}
export interface Finding {
  rule: string;
  severity: "error" | "warning";
  message: string;
  identity?: string;
  selector?: string;
  element?: string;
  reason?: string;
  actual?: unknown;
  expected?: unknown;
  box?: { x: number; y: number; width: number; height: number };
  designRules?: string[];
  sources?: string[];
  suggestion?: string;
  evidenceKind?: string;
  sourceCheck?: {
    provider: string;
    version: string | null;
    authority: "advisory" | "blocking";
    originalSeverity: string;
    rule: string | null;
  };
}
export type DesignPolicy = Awaited<
  ReturnType<typeof import("./design.mjs").readDesignPolicy>
>;
export interface PageResult {
  name: string;
  checkpoint?: string;
  checkpointSetup?: string;
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
    enforcement: "automated" | "behavioral" | "review";
    status: string;
    checks: string[];
  }[];
}
export interface FindingChange {
  id: string;
  page: string;
  checkpoint: string | null;
  viewport: Viewport;
  finding: Finding;
  reason?: string;
}
export interface ContractSnapshot {
  config: ProjectConfig;
  rules: Rule[];
  policySHA256: string;
  projectDocuments?: ProjectDocument[];
}
export interface ReviewChanges {
  comparison: "available" | "unavailable";
  baselineId: string | null;
  newFindings: FindingChange[];
  persistentFindings: FindingChange[];
  resolvedFindings: FindingChange[];
  notComparedFindings: FindingChange[];
  newlyUnassessed: {
    id: string;
    designRule: string;
    page: string;
    checkpoint: string | null;
    viewport: Viewport;
  }[];
  contract: ReturnType<typeof import("./contract.mjs").compareContracts>;
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
  sourceChecks?: Awaited<
    ReturnType<typeof import("./source-checks.mjs").runSourceChecks>
  >;
  changes?: ReviewChanges;
  designPolicy: DesignPolicy;
  contract: Awaited<ReturnType<typeof import("./contract.mjs").readContract>>;
}
export interface Reference {
  report: ReviewReport;
  note: string;
}
