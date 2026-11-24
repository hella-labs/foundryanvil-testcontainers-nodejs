---
title: Dedication to quality
description: How the library, the examples and this site are tested, how the docs stay in sync with the code, and how the site stays fast.
---

Every change goes through the same gate on every pull request and push to
`main`: build, typecheck, lint, unit tests with coverage, end-to-end tests
against real anvil nodes, and a full docs build. Any failure fails CI.

## Code coverage

[![Codecov coverage sunburst](https://codecov.io/gh/hella-labs/foundryanvil-testcontainers-nodejs/graphs/sunburst.svg?token=WU523RPLO1)](https://codecov.io/gh/hella-labs/foundryanvil-testcontainers-nodejs)

The sunburst is live from
[Codecov](https://codecov.io/gh/hella-labs/foundryanvil-testcontainers-nodejs):
the inner ring is `src/`, each outer ring a folder or file below it. Size is
the number of lines, colour is how much of them the unit tests cover.

Coverage is a floor, not a goal: each project fails its own build below these
thresholds.

| Project | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Library (`src/`) | 95% | 90% | 95% | 95% |
| Examples (`examples/`) | 95% | 90% | 95% | 95% |
| Docs tooling (`docs/plugins`, `docs/scripts`) | – | 90% | 95% | 95% |

At v0.7.0 the library sits at 98.6% statements, 96.9% branches, 99.3%
functions and 99.1% lines, and the docs tooling at 100% statements and 98.9%
branches.

## Unit tests

Fast, no Docker, run on every commit (Node 22 and 24 in CI).

| Suite | What it proves |
|---|---|
| Library: 508 tests in 34 files | every flag renders correctly, every conflict and dependency rule is enforced, the test client, cheats and container helpers behave, every error carries its code |
| Examples: 10 files | the examples' own helpers, and that the published package links and exports what the docs promise |
| Docs: 96 tests | the snippet sync engine, the reference generators, the content rules and API coverage (below) |

## End-to-end tests

Unit tests prove the code follows its rules; end-to-end tests prove the rules
match anvil. They start real nodes with Testcontainers.

- **CLI parity:** every flag, and every pair of flags the library can render,
  is run through the real anvil binary's argument parser. The verdict (ok,
  conflict, missing requirement) must match the library's flag registry.
  Every flag and every hardfork then boots a node.
- **Container and test client:** the container lifecycle and the test
  client's helpers against a live node.
- **Examples:** 18 end-to-end files, one per task area, consume the built
  package exactly as a user would (via `npm link`), on Node 22 and 24.

## Docs that can't rot

No code on this site is written by hand, so samples can't drift from the
library. Every sample is a `// #region` of a tested example, copied in by
`pnpm docs:sync`; reference tables are generated from the built library.

The build fails when:

- a sample differs from its region, or a region is missing or unused;
- a code block isn't linked to an example;
- a generated table differs from the library;
- a public API member, flag or error code is undocumented or never shown in a
  sample;
- a link or anchor is broken;
- the built pages don't contain the synced samples, or the examples behind
  them fail against anvil.

The full contract: [How the docs are tested](tested-docs.md).

## A fast docs site

- **Static HTML:** every page is pre-rendered at build time and readable
  before any JavaScript runs.
- **Small first load:** about 180 KB gzipped for a docs page (HTML, CSS and
  JavaScript). After that, navigation happens in the browser and linked pages
  are prefetched.
- **No redirects:** URLs match GitHub Pages' files exactly (no trailing
  slashes).
- **Lazy images and swap fonts:** below-the-fold images load on demand, and
  text renders right away in a fallback font while web fonts load.
- **Machine-readable:** a sitemap, plus `llms.txt` and `llms-full.txt` for AI
  tools.

## Run the gate yourself

From the repository root:

```bash
pnpm gate            # everything, with a local anvil binary
pnpm check:docker    # everything, with Docker (as CI)
```

See [CONTRIBUTING](https://github.com/hella-labs/foundryanvil-testcontainers-nodejs/blob/main/.github/CONTRIBUTING.md).
