# Roadmap

Priorities are ordered; dates are deliberately unspecified.

## 1. Useful density on larger viewports

The current prototype catches loss of configured comparisons and some underused
regions, but box coverage can be improved by stretching empty table space. Its
passing fixture is therefore not evidence of an effective large-screen layout.

Develop scoped observations for actual text/data marks, simultaneously visible
comparison identities, and distance between related values. Calibrate them through
the user's rejected and accepted layouts. Whitespace can support grouping and a
finite task need not fill the entire screen. Avoid a universal density score.

Acceptance: merely widening an otherwise unchanged table must not count as more
useful information; shrinking type below the accepted readable size must not help;
removing a previously visible comparison must still fail. Extend the existing
representative workflow to capture the actual regression, without a new test matrix.

## 2. Improve remediation precision

Show measurements grouped by affected comparison and explain likely causes such as
an oversized header, fixed-width wrapper, or unnecessary spacing. Differentiate a
direct constraint violation from a heuristic. Avoid claiming a suggested CSS edit
is proven merely because it could raise coverage.

## 3. Carefully bounded repair

Start with proposed patches for explicit token or alignment constraints. Every
patch must be reviewable and followed by a fresh capture. Learning a rule and editing
app code remain separate actions. Changes to data meaning, chart scale, hierarchy,
and density require judgment; broad automatic repair is outside the initial release.

## 4. Broader integrations when needed

Add renderer-backed chart evidence, additional states, or an agent protocol only
when a real application needs them. Establish macOS support with a representative
workflow before claiming it; Windows and multiple browser engines remain unverified.
