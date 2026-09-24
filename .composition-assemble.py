from pathlib import Path
import hashlib
import subprocess

# One-use branch assembly. Every existing-file replacement is exact and checked;
# the runner removes this script/workflow before committing the finished change.
expected = {
    'src/config.mjs': '2e61b24cce2d438e2abd394274bec1100fb2b05b',
    'src/design.mjs': 'b74bb3ddc0009146276b07d9c57e4af8a90a85e7',
    'src/types.d.ts': 'd89fd9d56c70775d67e5b0a54166d164b84fc95d',
    'src/checks.mjs': 'ddb7adf89c7c2b9bd4a5146de3ecf65fc01c2922',
    'src/policy-ids.mjs': '56e47d4cfd190b1e2c047e42b2002c1fda2bb52b',
    'test/review.test.mjs': '0e2a6953fa1e622af7913a3a90dbd9296a64f62d',
}
for name, sha in expected.items():
    data = Path(name).read_bytes()
    actual = hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    if actual != sha:
        raise RuntimeError(f'{name}: source changed; expected {sha}, got {actual}')
subprocess.run(['git', 'apply', '--check', '.composition-existing.patch'], check=True)
subprocess.run(['git', 'apply', '.composition-existing.patch'], check=True)

def replace(name, old, new):
    file = Path(name)
    text = file.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f'{name}: expected exactly one replacement for {old!r}')
    file.write_text(text.replace(old, new))

def append(name, content):
    file=Path(name)
    file.write_text(file.read_text().rstrip()+'\n\n'+content.strip()+'\n')

replace('src/checks.mjs', '''        if (rule.type === "consistent") {
          const values = {};''', '''        if (rule.type === "comparison-set" && rule.growthYield && !textBounds(el)) {
          evaluations.at(-1).status = "missing";
          add(
            rule,
            "Yield evidence needs visible, nonempty text; empty keyed boxes do not count.",
            el,
            key,
            "visible comparison evidence",
          );
          continue;
        }
        if (rule.type === "consistent") {
          const values = {};''')
rows = [
('DR-017', 'DR-017-intentional-alignment.md', 'automated', 'Alignment', 'Related elements share intentional visual anchors.'),
('DR-018', 'DR-018-spacing-rhythm.md', 'automated', 'Rhythm', 'Equivalent relationships use consistent spacing.'),
('DR-019', 'DR-019-spatial-economy.md', 'automated', 'Spatial Economy', 'Visual space is allocated according to task value rather than container availability.'),
('DR-020', 'DR-020-semantic-balance.md', 'review', 'Balance', 'Visual weight reflects semantic priority, not accidental asymmetry.'),
]
entries=''.join(f'  {{\n    id: "{id}",\n    file: "{file}",\n    enforcement: "{mode}",\n  }},\n' for id,file,mode,_,_ in rows)
replace('src/policy-ids.mjs', ']);\n\nexport const designRuleIds', entries+']);\n\nexport const designRuleIds')
index=''.join(f'## {id} — Rule of {title}\n\n{principle}\n\n[Canonical rule →](design-rules/{file})\n\n' for id,file,_,title,principle in rows)
replace('docs/design-rules.md', '## Refining the rules', index+'## Refining the rules')
replace('docs/design-rules.md', '## How to apply the rules', 'DR-017–DR-020 add task-scoped composition contracts. Their formulas and thresholds\nare Viewrule conventions, not experimentally established measures of design quality.\nSee [falsifiable composition](composition.md) for executable contracts and limits.\n\n## How to apply the rules')
append('docs/ui-review.md', '''## Composition and viewport-growth yield

[Composition contracts](composition.md) document DR-017–DR-020 and the optional
`comparison-set.growthYield` field (`min`, `availableKeys`). The finite inventory
caps the required growth count; duplicated or stretched boxes do not earn yield.
Existing configurations and presets remain unchanged. JSON reports expose
`pages[].viewportGrowth`; missing prerequisites remain unassessed, not a pass.''')
append('docs/ui-review-enforcement.md', '''## Composition contracts (DR-017–DR-020)

| Policy | Implemented measurement | Not certified |
| --- | --- | --- |
| DR-017 Alignment | `align` edge spread with declared peers and tolerance | Optical alignment, baseline alignment, and peer selection |
| DR-018 Rhythm | Repeated scoped `relative-position` intervals and required members | Inferred grouping, automatic rhythm or gap-variance score |
| DR-019 Spatial Economy | Optional `comparison-set.growthYield`, distinct identities, legibility prerequisites, finite cap | Semantic relevance or a universal occupancy target |
| DR-020 Balance | Explicit `style`, alignment and size contracts for declared roles | Generic salience, symmetry, or balance score |

[Measurement contract and rendered counterexamples](composition.md). A reference
capture alone does not establish growth coverage. Missing or failed comparison
prerequisites produce an unassessed yield finding rather than a misleading score.''')
append('README.md', '''## Falsifiable visual composition

DR-017–DR-020 cover alignment, rhythm, spatial economy, and balance through scoped
contracts, not a universal design score. Existing geometry/style checks protect
explicit peer relationships. Opt-in `comparison-set.growthYield` compares relative
distinct-evidence growth with relative CSS viewport-area growth and caps required
counts at a predeclared finite inventory. Stretching, duplication, or smaller type
cannot certify improvement. See [composition contracts](docs/composition.md).''')
replace('test/review.test.mjs', 'assert.equal(behaviorReport.designPolicy.rules.length, 16);', 'assert.equal(behaviorReport.designPolicy.rules.length, 20);')
replace('scripts/test-package.mjs', 'import { validateRules } from "../src/config.mjs";', 'import { validateRules } from "../src/config.mjs";\nimport { runCompositionCheckpoint } from "../docs/examples/composition-checkpoint.mjs";')
replace('scripts/test-package.mjs', '  await runPriorityCheckpoint(root);', '  await runPriorityCheckpoint(root);\n  await runCompositionCheckpoint(root);')
append('test/README.md', '''## Composition checkpoint

`npm test` also executes `docs/examples/composition-checkpoint.mjs` against native
browser measurements. It preserves accepted/rejected composition fixtures and
asserts alignment, relationship gaps, explicit peer type scale, viewport-growth
yield, duplicate rejection, finite saturation, missing reference, and unreadable
or empty evidence. `dist/composition-evidence/` contains machine results and
representative captures; none establishes a human-approved visual reference.''')
subprocess.run(['git', 'diff', '--check'], check=True)
