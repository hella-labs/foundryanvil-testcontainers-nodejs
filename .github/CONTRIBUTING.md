# Contributing

## Development

| Script                                                  | Description                                                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                                            | Build ESM + CJS + types into `dist/`                                                                                  |
| `pnpm typecheck`                                        | `tsc --noEmit`                                                                                                        |
| `pnpm lint`                                             | Lint (and fix)                                                                                                        |
| `pnpm test`                                             | All tests (e2e tests run in Docker when available, otherwise skip)                                                    |
| `pnpm test:unit [--coverage]`                           | Unit tests only (no Docker or anvil needed); thresholds enforced with `--coverage`                                    |
| `pnpm test:e2e`                                         | End-to-end tests against real anvil **in Docker** (default, CI/CD)                                                    |
| `pnpm test:e2e --no-docker`                             | End-to-end tests against a **local anvil binary** – bundled, no Docker or Foundry install needed (local testing only) |
| `pnpm examples:setup`                                   | Build the library if stale, install `examples/` (`npm ci`) and `npm link` the library                                 |
| `pnpm examples:unit [--coverage]`                       | Examples: setup + typecheck + lint + unit tests                                                                       |
| `pnpm examples:e2e [--no-docker]`                       | Examples: setup + typecheck + lint + workflows against anvil (Docker, or a local binary)                              |
| `pnpm docs:start`                                       | Docs site dev server (`docs/`)                                                                                        |
| `pnpm docs:sync`                                        | Sync the docs' code samples and generated reference tables                                                            |
| `pnpm docs:unit [--coverage]`                           | Docs: sync check + typecheck + lint + unit tests (incl. API coverage)                                                 |
| `pnpm docs:e2e [--no-docker]`                           | Docs: the examples behind every sample, site build, built-page checks (`--skip-examples` skips the first)             |
| `pnpm docs:build` / `docs:serve`                        | Production build of the site / serve it                                                                               |
| `pnpm bench [--baseline <dist/index.cjs>] [--rounds n]` | Benchmark the hot paths users pay for (local anvil, no Docker); compare with another build                            |
| `pnpm lockfiles:check`                                  | Lockfiles install native tools (anvil, swc, rollup…) on macOS and Linux                                               |
| `pnpm lockfiles:restore [--from <ref>]`                 | Put platform builds pruned by a re-resolve back from git                                                              |
| `pnpm gate`                                             | The full quality gate (see below); `check:local` is an alias                                                          |
| `pnpm check:docker`                                     | The gate with Docker for every e2e step (what CI runs)                                                                |

### Baseline quality gate

```shell
pnpm build && pnpm lint && pnpm typecheck && pnpm test:unit --coverage && pnpm test:e2e --no-docker \
  && pnpm examples:e2e --no-docker && pnpm examples:unit --coverage \
  && pnpm docs:unit --coverage && pnpm docs:e2e --no-docker --skip-examples
```

`pnpm gate` runs exactly this (the docs' e2e step skips the examples, which
the gate has just run). CI runs the Docker modes (`pnpm test:e2e`,
`pnpm examples:e2e`, and `pnpm docs:e2e` in the Pages workflow).

### Dependencies and lockfiles

The gate must run identically in the sandbox, in CI and on developer
machines (Linux and macOS), from a fresh clone:

```shell
pnpm install        # or --frozen-lockfile / CI=true: the lockfile is used as is
pnpm gate           # installs examples/ and docs/ with `npm ci`
```

- **pnpm is pinned** (`packageManager` in package.json); CI reads it from
  there. Three lockfiles are committed: `pnpm-lock.yaml`,
  `examples/package-lock.json`, `docs/package-lock.json`.
- **viem and testcontainers are pinned** to `2.57.1` / `12.2.0`, the newest
  patch releases the sandbox's registry mirror can install.
  **TODO:** bump them to `^2.57.20` / `^12.2.1` once the mirror serves them
  (tracked in `pnpm-workspace.yaml` and
  `test/unit/helpers/dependency-pins.test.ts`, which keeps the library, the
  examples and the lockfiles on the same versions).
- **Platform builds.** anvil, swc, rollup and unrs-resolver ship one npm
  package per platform. The mirror carries Linux x64 builds only, and pnpm /
  npm silently drop optional packages they cannot resolve, so re-resolving a
  lockfile there removes the macOS (and Linux arm64) builds. The lockfiles
  keep them with their npmjs.org integrity, and `pnpm lockfiles:check` (part
  of `pnpm test:unit`) fails when one is missing.
- **Changing dependencies** (e.g. the TODO above): `pnpm add <pkg>@<version>`;
  in `examples/` or `docs/` edit package.json and run `npm install` until
  package-lock.json stops changing (npm can need a second pass); then
  `pnpm lockfiles:restore` (builds of unchanged versions come back from
  `HEAD`), `pnpm lockfiles:check` and `pnpm gate`. New versions of a native
  package must be resolved once where all platforms are available (npmjs.org).
- `pnpm install --force` installs the optional builds of _every_ platform
  and therefore needs npmjs.org; every other install mode installs the
  current platform's builds only.

### End-to-end tests

The e2e suite (`test/e2e`) starts real anvil nodes and covers the container
lifecycle, transactions, accounts & keys, impersonation, time travel,
snapshots, state load/dump/persistence, genesis files, quiet/JSON logging,
fail-fast startup errors and CLI parity with the real anvil parser.

`test/e2e/test-client.e2e.test.ts` exercises the viem test client through
`useAnvil()`: every viem test action, every anvil extra, cheats, transports
(HTTP, batching, WebSocket subscriptions), node- and locally-signed default
accounts, pre-start validation, reset, strict snapshots and use-after-stop.
Its last shared-node test fails if any viem test action was not called (the
list is read from the installed viem, so upgrades that add actions fail until
they are mapped). Unit tests check that every mutating viem test action has a
`cheats` step; the docs project checks that the documentation site documents
(and demonstrates) every action, extra, step, setting and error code.

**Docker mode (default)** – `pnpm test:e2e` runs everything through
`AnvilContainer` / Testcontainers using the default image. This is what CI/CD
(e.g. GitHub Actions, where Docker is available) must use. If no container
runtime is found the command exits with a hint instead of failing obscurely.

**Local mode** – `pnpm test:e2e --no-docker` runs the same tests against a
local `anvil` process for machines without Docker. It prints a warning that it
is **only meant for local testing** and that CI/CD should use Docker (with an
extra notice when `CI` / `GITHUB_ACTIONS` is set, and a note when the local
anvil version differs from the default image). In this mode:

- it works **out of the box**: the `@foundry-rs/anvil` devDependency ships a
  prebuilt anvil for Linux/macOS (x64, arm64) and Windows x64, pinned to the
  same version as the default Docker image (a unit test keeps the two in sync);
- the binary is resolved in this order: `ANVIL_BINARY` (explicit override) →
  bundled `@foundry-rs/anvil` → `anvil` on the `PATH` → `~/.foundry/bin/anvil`
  (foundryup). The warning shows which one is used;
- the platform binary is executed directly (not the package's Node wrapper), so
  `SIGTERM` reaches anvil and state dumps are written on stop;
- the command line produced by `AnvilOptions` is used as-is, except that
  anvil binds to `127.0.0.1` on a free port (`getMappedPort()` returns it) and
  container file paths are mapped into a private temp directory;
- `stop()` sends `SIGTERM` (so state dumps are written) like `docker stop`;
- CLI parse checks run through the same shell script Docker mode executes in
  the container, split across one `sh` per CPU (Node's `spawn` serialises on
  the binary's `execve`); boot checks wait for a real JSON-RPC answer. A
  sample is also run through the script's `timeout(1)` fallback and compared.

Local mode does not exercise the container itself (image, entrypoint, port
publishing, file copies), which is why it must not replace Docker mode in CI.

Extra Jest arguments are forwarded, e.g. `pnpm test:e2e --no-docker -t parity`.
Optional environment variables (read from the shell; no `.env` file is
loaded):

| Variable                  | Purpose                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ANVIL_FORK_URL`          | Enables the forking e2e test.                                                                                                                       |
| `ANVIL_FORK_BLOCK_NUMBER` | Block to fork from (optional, used with `ANVIL_FORK_URL`).                                                                                          |
| `ANVIL_E2E_MODE`          | e2e mode for plain `pnpm test` runs: `docker` / `local` / `skip` (`pnpm test:e2e` and `pnpm test:e2e --no-docker` set it automatically).            |
| `ANVIL_BINARY`            | Overrides the anvil executable used by `pnpm test:e2e --no-docker` (local testing only). Defaults to the bundled `@foundry-rs/anvil` devDependency. |

### Examples project

`examples/` is a separate npm project (its own `package.json`,
`package-lock.json`, TypeScript, ESLint and Jest configuration) that
consumes the library through `npm link`, like an end user's project. It is
excluded from the root's TypeScript, ESLint and Jest runs and from the pnpm
workspace.

`scripts/examples.mjs` (behind the `pnpm examples:*` scripts) rebuilds the
library when `dist/` is older than its inputs, runs `npm ci` when the
examples' lockfile changed, re-links (installs remove links) and then runs
the task (`--coverage`, `--no-docker` and other arguments are forwarded to
the examples' scripts); pnpm's `npm_*` environment is not passed to npm.
Linking uses a project-local npm prefix (`examples/.npm-link/`), so the
global prefix is never touched. The examples create nodes with plain
`new AnvilContainer(options)`; with `--no-docker`, a Jest setup file routes
`AnvilContainer.startRuntime()` to a local anvil process. Its unit tests guard the link (symlink to this checkout, fresh
`dist/`, no dependency leaks, no lifecycle scripts in the library that
`npm link` would run), the contract artifacts (`examples/artifacts/<Name>/`
ABI `.json` + creation bytecode `.bin`: both present, ABI and bytecode
consistent; the repository contains no Solidity sources), the API
coverage (every viem test action, anvil extra, `cheats` step,
`TestClientOptions` setting and `StartedAnvilContainer` member is called by
an example; the README's coverage map matches the code) and the README
samples (generated from `// #region` blocks of the tests:
`npm run docs:sync` in `examples/`). The same regions are the code samples
of the documentation site (below). See [examples/README.md](../examples/README.md).

### Documentation site

`docs/` is a separate npm project: a [Docusaurus](https://docusaurus.io) site
published to GitHub Pages by `.github/workflows/docs.yml`. No code on it is
written by hand:

- **code samples** are `#region` blocks of `examples/` — a fence
  ` ```ts snippet="examples/<file>#<region>" ` is filled by `pnpm docs:sync`;
  `pnpm docs:unit` and `docusaurus build` fail when a sample is stale, a code
  block is unlinked, or a region is shown nowhere;
- **reference tables** between `<!-- generated:… -->` markers are rendered
  from the built library (flag registry, error codes, enums, constants);
- the **README's quick start** is a synced region too.

`pnpm docs:unit` also checks that every public export, option method, flag,
test action, anvil extra, `cheats` step, client setting, node member and
error code is documented on the reference pages and demonstrated by a
sample. When you add API: add an example region, reference it from a task
page, run `pnpm docs:sync`. Details: [docs/README.md](../docs/README.md).

### Module formats

- `dist/index.js` – ESM
- `dist/index.cjs` – CommonJS
- `dist/index.d.ts` / `dist/index.d.cts` – TypeScript declarations

### Publishing

```bash
pnpm run build
np --no-publish
git push origin --tags   # triggers release.yml and publish.yml
```

### Custom Docker image

```shell
docker build -t hellaweb3/foundry-anvil:1.6 .
docker run -p 8545:8545 hellaweb3/foundry-anvil:1.6
cast block-number
```

## Feature matrix (requirements → API)

| Requirement                               | Where                                                                                                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chain identity                            | `evm.withChainId()`, `evm.withHardfork()`, `state.withTimestamp()`, `mining.withBlockNumber()`, `state.withInit()`, `network.*`                                                                                                      |
| RPC server                                | `server.*` (port, IPC, CORS, request size, threads, cache path); host managed                                                                                                                                                        |
| Fork config                               | `fork.*` incl. `url@block`, headers, retries, timeouts, rate limits, offline start                                                                                                                                                   |
| Startup reliability                       | JSON-RPC readiness probe, crash detection with logs, `AnvilStartupError`, chain-id resolution                                                                                                                                        |
| Accounts, balances, impersonation         | `account.*`, `accounts()` with keys, `setBalance*()`, `impersonate()`, `withImpersonation()`, `setAutoImpersonate()`                                                                                                                 |
| Mining, time, fees, execution limits      | `mining.*`, `evm.withGasLimit()/withGasPrice()/withBlockBaseFeePerGas()/withCodeSizeLimit()/withMemoryLimit()`, `mine()`, `increaseTime()`, `setNextBlockTimestamp()`, `setMinGasPrice()`, `setBlockGasLimit()`                      |
| State loading & dump reports              | `state.withLoadState()/withDumpState()/withState()/withStateInterval()/withPreserveHistoricalStates()`, `dumpStateToFile()`, `loadStateFromFile()`, `state.withConfigOut()`                                                          |
| RPC controls, tracing, diagnostics        | `evm.withPrintTraces()/withStepsTracing()`, `logs.*`, `rpc()`, `nodeInfo()`, `metadata()`, `setLoggingEnabled()`, `logText()`                                                                                                        |
| Pre-configured viem test client           | `StartedAnvilContainer.testClient` (test + public + wallet actions + `anvilActions`), typed default account (`AnvilContainer<TAccount>`)                                                                                             |
| Test client config & pre-start validation | `TestClientOptions` (transport, polling, cache, timeout, retries, batching, default account, chain metadata) via `AnvilContainer.withTestClient()`, checked in `prepare()`                                                           |
| Account & on-chain state controls         | `cheats.setBalance/addBalance/dealErc20/setErc20Allowance/setCode/setNonce/setStorageAt/impersonate…`, `testClientFor()`                                                                                                             |
| Contract calls & transactions             | viem `readContract/simulateContract/writeContract/deployContract/sendTransaction/sendUnsignedTransaction`, `confirm()` with revert reasons                                                                                           |
| Block, time, chain & RPC config           | `cheats.mine/setAutomine/setIntervalMining/increaseTime/setNextBlockTimestamp/setTime/setBlockTimestampInterval/setCoinbase/setBlockGasLimit/setNextBlockBaseFeePerGas/setMinGasPrice/setChainId/setRpcUrl`, `rollback()`, `reorg()` |
| Snapshots, reset, lifecycle               | `snapshot()` / strict `revert()`, `withSnapshot()`, `checkpoint()`, `reset()`, `useAnvil()` (hooks + per-test isolation), `CONTAINER_STOPPED` after `stop()`                                                                         |
| Transaction pool                          | `getTxpoolContent/Status`, `inspectTxpool`, `cheats.dropTransaction/dropAllTransactions/removePoolTransactions`                                                                                                                      |

## Test speed

- Jest transforms TypeScript with `@swc/jest` (type checking is `pnpm typecheck`'s job).
- Bulk suites (combinations, CLI parity) check every case in plain code and
  assert the collected mismatches once per group: the same coverage without
  Jest's per-assertion overhead, and failures list every offending case.
- e2e files run in parallel.

## Fixtures

- `test/fixtures/anvil-help.txt` – `anvil --help` of the default image's
  version; the registry is checked against it. Refresh it when bumping anvil.
- `test/fixtures/state.json` – a state dump written by anvil 1.6.0-rc1.
- `test/fixtures/genesis.json` – minimal genesis with one funded account.

## Contracts used in tests

WETH (`test/artifacts/WrappedEther`): https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2#code

## Flag coverage matrix

The full flag matrix (aliases, fluent methods, conflicts, requirements) is
generated from the registry:

```shell
npx tsx scripts/flag-matrix.ts
```

## Package size

`pnpm build` runs `tsdx build` followed by `scripts/compact-dist.mjs`, which
strips comments and whitespace from the JS bundles (names are not mangled, so
stack traces stay readable). JSDoc is kept terse and lives in the `.d.ts`
files; only `dist/` is published, without source or declaration maps.
