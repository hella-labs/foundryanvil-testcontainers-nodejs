<div align="center">

<h1>Foundry Anvil Testcontainers NodeJS Module</h1>

<a href="https://github.com/hella-labs/foundryanvil-testcontainers-nodejs/actions/workflows/main.yml"><img alt="Build+Test Status" src="https://github.com/hella-labs/foundryanvil-testcontainers-nodejs/actions/workflows/main.yml/badge.svg" /></a>
<a href="https://codecov.io/gh/hella-labs/foundryanvil-testcontainers-nodejs"><img alt="codecov" src="https://codecov.io/gh/hella-labs/foundryanvil-testcontainers-nodejs/graph/badge.svg?token=WU523RPLO1" /></a>
<a href="https://www.npmjs.com/package/@hellaweb3/foundryanvil-testcontainers-nodejs"><img alt="npm version" src="https://img.shields.io/npm/v/%40hellaweb3%2Ffoundryanvil-testcontainers-nodejs" /></a>
<a href="https://www.npmjs.com/package/@hellaweb3/foundryanvil-testcontainers-nodejs"><img alt="npm downloads" src="https://img.shields.io/npm/dy/%40hellaweb3%2Ffoundryanvil-testcontainers-nodejs" /></a>
<a href="https://hellalabs.dev/foundryanvil-testcontainers-nodejs/"><img alt="Documentation" src="https://img.shields.io/badge/docs-task%20guides%20%26%20API-c2410c" /></a>
<a href="https://app.fossa.com/projects/git%2Bgithub.com%2Fhella-labs%2Ffoundryanvil-testcontainers-nodejs?ref=badge_shield" alt="FOSSA Status"><img src="https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhella-labs%2Ffoundryanvil-testcontainers-nodejs.svg?type=shield"/></a>

**[📖 Documentation](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/)** ·
[Quick start](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/get-started/quick-start) ·
[Tasks](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs) ·
[API reference](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference) ·
[Examples](examples/README.md)

</div>

A [Testcontainers](https://testcontainers.com/) module that runs a
[Foundry Anvil](https://getfoundry.sh/anvil/overview) node in Docker for tests.

- **Every anvil flag** through a fluent, type-safe API grouped like `anvil --help`.
- **No misconfiguration**: values are validated immediately, conflicting flags
  throw, dependencies are checked before start, and the command line renders
  deterministically. The rules are verified against the real anvil binary.
- **Reliable startup**: readiness probes JSON-RPC (any log settings); if anvil
  exits, its own error output is reported immediately.
- **Host files just work**: state snapshots, genesis and `--config-out` take
  host paths and are copied in/out of the container.
- **Pre-configured [viem](https://viem.sh) test client**, strongly typed and
  bound to the node: every viem test, public and wallet action, anvil extras
  (ERC-20 dealing, chain id, time, rollback/reorg, txpool), a fluent
  awaitable `cheats` API, validated configuration (transport, polling,
  retries, batching, default account) and test lifecycle hooks (`useAnvil`).

Default image: `ghcr.io/foundry-rs/foundry:v1.6.0-rc1` ·
[Anvil reference](https://getfoundry.sh/anvil/reference/anvil)

> The **[documentation site](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/)** is organised by task ("fast-forward
> time", "act as a whale", "fork mainnet"…), with a complete API reference.
> Every code sample there — and in this README — is a region of a test in
> [`examples/`](examples/README.md) that runs against a real anvil in CI.

## Installation

```shell
pnpm add -D @hellaweb3/foundryanvil-testcontainers-nodejs
```

Requires Node.js ≥ 22 and a Docker-compatible runtime
([or none](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/get-started/run-without-docker)).

## Quick start

A complete test file:

```ts snippet="examples/test/e2e/quick-start.e2e.test.ts#quick-start"
import {
  AnvilContainer,
  AnvilOptions,
  Hardfork,
  useAnvil,
} from "@hellaweb3/foundryanvil-testcontainers-nodejs";
import { parseEther } from "viem";

const options = new AnvilOptions().account
  .withAccounts(5)
  .withBalance(1_000) // ETH per dev account
  .evm.withChainId(1337)
  .withHardfork(Hardfork.Cancun)
  .logs.quiet();

// Starts in beforeAll, stops in afterAll, restores the state after every test.
const anvil = useAnvil(
  new AnvilContainer(options).withTestClient((client) => client.withAccount(0)),
);

it("sends Ether", async () => {
  const [, bob] = await anvil.addresses();
  // No `account` needed: dev account 0 is the typed default signer.
  const receipt = await anvil.confirm(
    anvil.testClient.sendTransaction({ to: bob, value: parseEther("1") }),
  );
  expect(receipt.status).toBe("success");
  expect(await anvil.testClient.getChainId()).toBe(1337);
});

it("manipulates the chain fluently", async () => {
  const whale = "0x1111111111111111111111111111111111111111";
  await anvil.cheats
    .setBalanceEther(whale, 1_000)
    .impersonate(whale)
    .increaseTime({ days: 7 })
    .mine();
  expect(await anvil.getBalance(whale)).toBe(parseEther("1000"));
});
```

Without `useAnvil`: `const anvil = await new AnvilContainer(options).start()`
in `beforeAll` and `await anvil.stop()` in `afterAll`
([lifecycle](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/test-suites/manage-the-lifecycle)).

## Documentation

| I want to… | Guide |
|---|---|
| Start one node per test file and reset it between tests | [Share a node](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/test-suites/share-a-node) · [Isolate tests](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/test-suites/isolate-tests) |
| Use dev accounts, impersonate whales, fund accounts | [Accounts](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/accounts/use-dev-accounts) · [Impersonate](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/accounts/impersonate-accounts) · [Fund](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/accounts/fund-accounts) |
| Send transactions, assert custom errors, simulate | [Send](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/transactions/send-transactions) · [Reverts](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/transactions/assert-reverts) · [Simulate](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/transactions/simulate-calls) |
| Fast-forward time, control mining and block contents | [Time](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/time-and-blocks/travel-in-time) · [Mining](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/time-and-blocks/control-mining) · [Blocks](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/time-and-blocks/build-blocks) |
| Mock contracts, save and load state, custom genesis | [Mocks](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/state/mock-contracts) · [State files](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/state/save-and-load-state) · [Genesis](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/state/custom-genesis) |
| Fork mainnet | [Fork a chain](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/forking/fork-a-chain) |
| Watch events and query logs | [Events](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/events/watch-events) |
| Configure the chain, EVM, RPC server, logs, test client | [Configure](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/configure/chain) |
| Trace a failed transaction | [Debug](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/tasks/debugging/trace-transactions) |

## API at a glance

| API | Reference |
|---|---|
| `AnvilOptions`: every anvil flag in groups (`.account`, `.evm`, `.fork`, `.mining`, `.logs`, `.network`, `.server`, `.state`), validated as you set it | [Options](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/anvil-options) · [Flag rules](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/flag-rules) |
| `AnvilContainer`: options + test client settings → a started node | [AnvilContainer](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/anvil-container) |
| `StartedAnvilContainer`: test client, cheats, account / transaction / time / state helpers | [StartedAnvilContainer](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/started-anvil-container) |
| `anvil.testClient`: every viem test, public and wallet action plus anvil extras | [Test client](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/test-client) · [anvil extras](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/anvil-actions) |
| `anvil.cheats`: fluent, awaitable chains of state changes | [Cheats](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/cheats) |
| `TestClientOptions`: transport, polling, retries, batching, default account, chain | [TestClientOptions](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/test-client-options) |
| `useAnvil()`: lifecycle hooks with per-test isolation | [useAnvil](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/use-anvil) |
| Errors and error codes | [Errors](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/docs/reference/errors) |

## Examples

[examples/](examples/README.md) is a separate npm project that uses this
library through `npm link`, like your own project would. Its tested
workflows call every viem test action, every anvil extra and every `cheats`
step against a real anvil: fixtures with per-test isolation, multiple actors
and multicall, time travel and interval mining, custom errors and panics,
whales and impersonation, mempool and block building, WebSocket
subscriptions and filters, `eth_simulateV1` simulations and access lists,
mocking dependencies with `setCode` and state overrides, state fixtures and
custom genesis files, forking, EIP-712 and EIP-7702 signing, chain
configuration and reorgs, node configuration (CORS, EVM limits, CREATE2)
and call tracing. They are the source of every code sample in the
[documentation](https://hellalabs.dev/foundryanvil-testcontainers-nodejs/).

## Contributing

Scripts, the e2e suite (`pnpm test:e2e`, or `--no-docker` for local testing),
the docs site (`pnpm docs:start`) and release steps: see
[CONTRIBUTING.md](./CONTRIBUTING.md).

----

Maintained by [Hella Labs](https://hellalabs.dev/) · MIT


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhella-labs%2Ffoundryanvil-testcontainers-nodejs.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fhella-labs%2Ffoundryanvil-testcontainers-nodejs?ref=badge_large)