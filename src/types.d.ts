// Internal contracts for checkJs. Ajv remains authoritative for runtime input,
// including required fields on each rule type; these declarations emit no code.
export type Selection = string[] | { include: string[]; exclude?: string[] };

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
  command?: string[];
  targets?: string[];
  noConfig?: boolean;
  authority: "advisory" | "blocking";
  enabled?: boolean;
  version?: string;
  format?: "viewrule" | "impeccable";
  cwd?: string;
  severityMap?: Record<string, "error" | "warning">;
}
export interface ReviewScope {
  name: string;
  sourcePaths: Selection;
  dependsOn?: string[];
  pages?: Selection;
  viewports?: Selection;
  documents?: Selection;
  requiredDocuments?: string[];
  sourceChecks?: string[];
}
export interface EvidenceProvenance {
  kind: "fresh" | "reused";
  runId: string;
  createdAt: string;
  reusedFrom?: string;
  browserVersion?: string;
}
export interface MeasurementRecord {
  key: string;
  fingerprint: string;
  evidence: EvidenceProvenance;
  rawFindings?: Finding[];
  artifacts?: Record<string, string>;
}
export interface ScopeStatus {
  name: string;
  fingerprint: string;
  status: "dirty" | "reusable" | "unknown";
  reason: string;
  dependsOn: string[];
  inputs: string[];
  documents: string[];
}
export interface ExecutionSummary {
  mode: "full" | "incremental";
  scopes: ScopeStatus[];
  browser: { required: number; executed: number; reused: number };
  sourceChecks: { required: number; executed: number; reused: number };
}
export interface SourceCheckResult {
  evidence?: EvidenceProvenance;
  provider: {
    id: string;
    version: string | null;
    authority: "advisory" | "blocking";
    command: string[];
    cwd: string;
    format: string;
    engineVersion?: string;
    binarySHA256?: string;
    targets?: string[];
    noConfig?: boolean;
  };
  execution: {
    code: number;
    stdout: string;
    stderr: string;
    elapsedMs: number;
  };
  findings: Finding[];
}
export interface ProjectConfig {
  version: 1;
  baseURL?: string;
  /** Deprecated; accepted for existing configurations, never enables Stop blocking. */
  enforceOnStop?: boolean;
  sourcePaths: Selection;
  reviewScopes?: ReviewScope[];
  evidenceReuse?: { environmentKey: string; maxAgeMs: number };
  accessibility: boolean;
  projectDocuments?: Selection;
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
    viewports?: Selection;
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
    | "alignment-residual"
    | "gap-variance"
    | "peer-footprint"
    | "chrome-allocation"
    | "viewport-growth-yield"
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
  pages?: Selection;
  viewports?: Selection;
  optional?: boolean;
  feedbackId?: string;
  designRules?: string[];
  sources?: string[];
  edge?: "left" | "right" | "top" | "bottom" | "center-x" | "center-y";
  axis?: "x" | "y";
  maxResidual?: number;
  maxCoefficientOfVariation?: number;
  maxRatio?: number;
  referenceViewport?: string;
  minYield?: number;
  finiteKeys?: string[];
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
  measure?: "boxes" | "text" | "area" | "font-size";
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
export interface CompositionMeasurement {
  rule: string;
  type: string;
  element: string | null;
  status: "measured" | "unassessed";
  valid: boolean;
  problems: string[];
  count?: number;
  edge?: Rule["edge"];
  anchors?: number[];
  median?: number;
  maxResidual?: number;
  axis?: Rule["axis"];
  measure?: Rule["measure"];
  values?: number[];
  gaps?: number[];
  mean?: number;
  coefficientOfVariation?: number;
  regionArea?: number;
  chromeArea?: number;
  ratio?: number;
}
export interface GrowthMeasurement {
  rule: string;
  element: string | null;
  status: "measured" | "unassessed";
  valid: boolean;
  width: number;
  height: number;
  area: number;
  keys: string[];
  items: {
    element: string;
    key: string | null;
    eligible: boolean;
    reasons: string[];
    minFontSize: number | null;
  }[];
  problems: string[];
  comparison?: {
    status: "reference" | "measured" | "saturated" | "unassessed";
    referenceViewport: string;
    referenceArea?: number;
    referenceCount?: number;
    areaGrowth?: number;
    evidenceGrowth?: number;
    yield?: number | null;
    lostKeys?: string[];
    reason?: string;
  };
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
  evidence?: EvidenceProvenance;
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
  evidence?: EvidenceChange[];
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
export interface EvidenceChange {
  page: string;
  checkpoint: string | null;
  viewport: Viewport;
  status: "changed" | "unchanged" | "not-compared";
  reason: string;
  method: typeof import("./evidence-changes.mjs").evidenceMethod;
  width?: number;
  height?: number;
  changedPixels?: number;
  regionCount?: number;
  omittedRegions?: number;
  regions: {
    x: number;
    y: number;
    width: number;
    height: number;
    changedPixels: number;
    before: string;
    after: string;
  }[];
}
export interface ReviewReport {
  execution?: ExecutionSummary;
  measurements?: {
    version: 1;
    pages: MeasurementRecord[];
    sourceChecks: MeasurementRecord[];
  };
  version: 1;
  id: string;
  project: string;
  createdAt: string;
  targetBaseURL: string;
  engineVersion: string;
  fingerprint: string;
  browserVersion?: string;
  status: "pass" | "fail";
  summary: { errors: number; warnings: number };
  pages: PageResult[];
  sourceChecks?: SourceCheckResult[];
  changes?: ReviewChanges;
  designPolicy: DesignPolicy;
  contract: Awaited<ReturnType<typeof import("./contract.mjs").readContract>>;
}
export interface Reference {
  report: ReviewReport;
  note: string;
}
