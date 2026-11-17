<div align="center">

<h1>Foundry Anvil Testcontainers NodeJS Module</h1>

<a href="https://github.com/hella-web3/foundryanvil-testcontainers-nodejs/actions/workflows/main.yml"><img alt="Build+Test Status" src="https://github.com/hella-web3/foundryanvil-testcontainers-nodejs/actions/workflows/main.yml/badge.svg" /></a>
<a href="https://www.npmjs.com/package/@hellaweb3/foundryanvil-testcontainers-nodejs"><img alt="npm version" src="https://img.shields.io/npm/v/%40hellaweb3%2Ffoundryanvil-testcontainers-nodejs" /></a>
<a href="https://www.npmjs.com/package/@hellaweb3/foundryanvil-testcontainers-nodejs"><img alt="npm downloads" src="https://img.shields.io/npm/dy/%40hellaweb3%2Ffoundryanvil-testcontainers-nodejs" /></a>

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

## Installation

```shell
pnpm add -D @hellaweb3/foundryanvil-testcontainers-nodejs
```

Requires Node.js ≥ 22 and a Docker-compatible runtime.

## Quick start

```ts
import { AnvilContainer, AnvilOptions, Hardfork, useAnvil } from "@hellaweb3/foundryanvil-testcontainers-nodejs";
import { parseEther } from "viem";

const options = new AnvilOptions()
  .account.withAccounts(5).withBalance(1_000)
  .evm.withChainId(1337).withHardfork(Hardfork.Cancun)
  .logs.quiet();

// Starts in beforeAll, stops in afterAll, restores the state after every test.
const anvil = useAnvil(
  new AnvilContainer(options).withTestClient((client) => client.withAccount(0)),
);

it("sends Ether", async () => {
  const [, bob] = await anvil.addresses();
  // `account` is optional: the test client has a typed default account.
  const receipt = await anvil.confirm(
    anvil.testClient.sendTransaction({ to: bob, value: parseEther("1") }),
  );
  expect(receipt.status).toBe("success");
  expect(await anvil.testClient.getChainId()).toBe(1337);
});

it("manipulates the chain fluently", async () => {
  const whale = "0x1111111111111111111111111111111111111111";
  await anvil.cheats.setBalanceEther(whale, 1_000).impersonate(whale).increaseTime({ days: 7 }).mine();
});
```

Without `useAnvil`: `const anvil = await new AnvilContainer(options).start()`
in `beforeAll` and `await anvil.stop()` in `afterAll`.

## `AnvilOptions`

Groups: `.account`, `.evm`, `.fork`, `.mining`, `.logs`, `.network`,
`.server`, `.state`. Every setter returns its group, every group exposes the
other groups, and every group *is* an `AnvilOptions`:

```ts
const options: AnvilOptions = new AnvilOptions()
  .account.withAccounts(5).withBalance(100)
  .mining.withBlockTime(1).withMixedMining();
options.toCommand(); // anvil --host 0.0.0.0 --accounts 5 --block-time 1 --balance 100 --mixed-mining
```

Boolean setters take `enabled = true` (`false` removes the flag). Numeric
setters accept `number | bigint`. Invalid input throws
`AnvilConfigurationError`. Each group has `reset()`.

### Account (`.account`)

| Method | Flag | Notes |
|---|---|---|
| `account.withAccounts()` | `--accounts` (`-a`) | default 10 |
| `account.withBalance()` | `--balance` | whole Ether, default 10000 |
| `account.withDerivationPath()` | `--derivation-path` | default `m/44'/60'/0'/0/` |
| `account.withMnemonic()` | `--mnemonic` (`-m`) | 12–24 words |
| `account.withRandomMnemonic()` | `--mnemonic-random` | optional word count |
| `account.withMnemonicSeedUnsafe()` | `--mnemonic-seed-unsafe` | `u64` seed |
| `account.autoImpersonate()` | `--auto-impersonate` (`--auto-unlock`) | also `evm.autoImpersonate()` |

One mnemonic source at a time.

### EVM (`.evm`)

| Method | Flag | Notes |
|---|---|---|
| `evm.withChainId()` | `--chain-id` (`--chain`) | default 31337 |
| `evm.withHardfork()` | `--hardfork` | `Hardfork`, or `OpHardfork` with `--optimism`; `Hardfork.Latest` omits the flag (anvil rejects `latest`) |
| `evm.withBlockBaseFeePerGas()` | `--block-base-fee-per-gas` (`--base-fee`) | wei |
| `evm.withGasPrice()` | `--gas-price` | wei |
| `evm.disableMinPriorityFee()` | `--disable-min-priority-fee` (`--no-priority-fee`) | |
| `evm.withGasLimit()` | `--gas-limit` (`--block-gas-limit`) | |
| `evm.disableBlockGasLimit()` | `--disable-block-gas-limit` (`--no-gas-limit`) | |
| `evm.withCodeSizeLimit()` | `--code-size-limit` | bytes |
| `evm.disableCodeSizeLimit()` | `--disable-code-size-limit` | |
| `evm.withMemoryLimit()` | `--memory-limit` | bytes |
| `evm.autoImpersonate()` | `--auto-impersonate` | |
| `evm.disableDefaultCreate2Deployer()` | `--disable-default-create2-deployer` (`--no-create2`) | |
| `evm.disablePoolBalanceChecks()` | `--disable-pool-balance-checks` | |
| `evm.withPrintTraces()` | `--print-traces` (`--enable-trace-printing`) | |
| `evm.withStepsTracing()` | `--steps-tracing` (`--tracing`) | geth-style `debug_*` traces |

### Fork (`.fork`)

All options require `fork.withForkUrl()` (checked at build time, any call
order). The URL is resolved inside the container — use
`http://host.docker.internal:<port>` for a node on the host.

| Method | Flag | Notes |
|---|---|---|
| `fork.withForkUrl()` | `--fork-url` (`-f`, `--rpc-url`) | `url@block` or 2nd arg set the block |
| `fork.withForkBlockNumber()` | `--fork-block-number` | negative = relative to latest |
| `fork.withForkTransactionHash()` | `--fork-transaction-hash` | |
| `fork.withForkChainId()` | `--fork-chain-id` | offline start; needs block number or tx hash |
| `fork.withForkHeader()` / `fork.withForkHeaders()` | `--fork-header` | add / replace `Name: value` |
| `fork.withForkRetryBackoff()` | `--fork-retry-backoff` | ms |
| `fork.withRetries()` | `--retries` | default 5 |
| `fork.withTimeout()` | `--timeout` | ms, default 45000 |
| `fork.withComputeUnitsPerSecond()` | `--compute-units-per-second` (`--cups`) | default 330 |
| `fork.noRateLimit()` | `--no-rate-limit` (`--no-rpc-rate-limit`) | |
| `fork.noStorageCaching()` | `--no-storage-caching` | |

```ts
new AnvilOptions().fork.withForkUrl(`https://mainnet.infura.io/v3/${KEY}`, 18_000_000).withRetries(10);
```

### Mining (`.mining`)

| Method | Flag | Notes |
|---|---|---|
| `mining.withBlockTime()` | `--block-time` (`-b`, `--blockTime`) | seconds, fractions allowed |
| `mining.withMixedMining()` | `--mixed-mining` | interval + automine; needs block time |
| `mining.withNoMining()` | `--no-mining` (`--no-mine`) | on demand only |
| `mining.withAutoMining()` | – | back to automine (removes the above) |
| `mining.withBlockNumber()` | `--number` | genesis block number |
| `mining.withSlotsInAnEpoch()` | `--slots-in-an-epoch` | default 32 |

### Logs (`.logs`)

| Method | Flag | Notes |
|---|---|---|
| `logs.verboseLogs()` | `--verbosity` (`-v` … `-vvvvv`) | `LogVerbosity` or 1–5 |
| `logs.quiet()` | `--quiet` (`-q`) | readiness doesn't need logs |
| `logs.withColor()` | `--color` | `Color.Auto/Always/Never` |
| `logs.jsonLogFormat()` | `--json` | |
| `logs.withMarkdownFormat()` | `--md` | |
| `logs.disableConsoleLog()` | `--disable-console-log` (`--no-console-log`) | |

### Network (`.network`)

| Method | Flag | Notes |
|---|---|---|
| `network.withOptimism()` | `--optimism` | hardforks must be `OpHardfork` |
| `network.withCelo()` | `--celo` | |

### Server (`.server`)

| Method | Flag | Notes |
|---|---|---|
| `server.withPort()` | `--port` (`-p`) | container port, mapped automatically; default 8545 |
| `server.withIpc()` | `--ipc` (`--ipcpath`) | container path, default `/tmp/anvil.ipc` |
| `server.withThreads()` | `--threads` (`-j`, `--jobs`) | 0 = logical cores |
| `server.withAllowOrigin()` | `--allow-origin` | default `*` |
| `server.noCors()` | `--no-cors` | |
| `server.noRequestSizeLimit()` | `--no-request-size-limit` | |
| `server.withCachePath()` | `--cache-path` | container path |

`--host` is managed by the container (always `0.0.0.0`).

### State (`.state`)

| Method | Flag | Notes |
|---|---|---|
| `state.withLoadState()` | `--load-state` | host file copied in |
| `state.withDumpState()` | `--dump-state` | copied to the host on stop |
| `state.withState()` | `--state` | load if present + dump |
| `state.withInit()` | `--init` | `genesis.json` |
| `state.withConfigOut()` | `--config-out` | resolved config incl. keys, copied out after start |
| `state.withStateInterval()` | `--state-interval` (`-s`) | needs a dump target |
| `state.withPreserveHistoricalStates()` | `--preserve-historical-states` | needs a dump target |
| `state.withMaxPersistedStates()` | `--max-persisted-states` | |
| `state.withPruneHistory()` | `--prune-history` | optional in-memory count |
| `state.withTransactionBlockKeeper()` | `--transaction-block-keeper` | |
| `state.withTimestamp()` | `--timestamp` | seconds, bigint or `Date` |
| `state.withOrder()` | `--order` | `Order.Fees` (default) / `Order.Fifo` |

File options take a host path (copied in before start / out after start or
stop) or `containerPath("/abs")` for files already in the image. Dumps on exit
need a graceful stop, which `StartedAnvilContainer.stop()` does.

```ts
new AnvilOptions().state.withState("./.anvil/state.json").withStateInterval(30);
```

### Rules

Conflicts throw when the second flag is set; dependencies are checked by
`validate()` / `build()` / `start()`.

| Rule | Flags |
|---|---|
| One mnemonic source | `--mnemonic` ⟂ `--mnemonic-random` ⟂ `--mnemonic-seed-unsafe` |
| One mining mode | `--no-mining` ⟂ `--block-time`; `--mixed-mining` → `--block-time` |
| State sources | `--state` ⟂ `--init` / `--dump-state` / `--load-state`; `--init` ⟂ `--dump-state` / `--load-state` / `--preserve-historical-states` |
| Dump helpers | `--state-interval`, `--preserve-historical-states` → `--dump-state` or `--state` |
| History | `--max-persisted-states` ⟂ `--prune-history` |
| CORS | `--no-cors` ⟂ `--allow-origin` |
| Fork | fork options → `--fork-url`; `--fork-block-number` ⟂ `--fork-transaction-hash`; `--fork-chain-id` → block number or tx hash |
| Limits | `--gas-limit` ⟂ `--disable-block-gas-limit`; `--code-size-limit` ⟂ `--disable-code-size-limit` |
| Logging | `--quiet` ⟂ `-v` / `--json`; `--json` ⟂ `--color` / `--md` |
| Networks | `--celo` ⟂ `--optimism`; `OpHardfork` → `--optimism`; `Hardfork` ⟂ `--optimism` |

Three rules are deliberately stricter than anvil (which accepts but ignores
them): the two dump helpers without a target, and `--mixed-mining` with
`--no-mining`. See `FlagSpec.stricterThanAnvil`; `ANVIL_FLAGS` exposes the
whole registry.

### Composition and inspection

| Method | Description |
|---|---|
| `clone()` | independent deep copy |
| `apply(...presets)` | run `(o: AnvilOptions) => void` presets |
| `unset(...flags)` | remove flags, e.g. to swap a conflicting one |
| `withExtraArgs(...args)` | raw args for newer anvil flags (known flags rejected) |
| `validate()` / `problems()` | throw / list dependency problems |
| `build()` | validated immutable `AnvilConfiguration` |
| `toArgs()` / `entryPoint` / `toCommand()` / `toJSON()` | rendered command |
| `has()` / `get()` / `flags()` / `root()` | inspection |

```ts
const base = () => new AnvilOptions().account.withAccounts(3);
const ci = base().apply((o) => o.mining.withBlockTime(1));
const random = ci.clone().unset("--mnemonic").account.withRandomMnemonic();
```

Rendering is canonical (`--help` order), uses `--flag=value` for optional
values and values starting with `-`, and repeats multi-value flags.

## `AnvilContainer`

Extends `GenericContainer` (all builders available, e.g. `withStartupTimeout`
for slow forks).

| Member | Description |
|---|---|
| `new AnvilContainer(options?, image?)` | defaults: anvil defaults, `DEFAULT_ANVIL_IMAGE` |
| `withTestClient(options \| (c) => c…)` | configures `StartedAnvilContainer.testClient` (see [Test client](#test-client)); typed: a default account makes `account` optional |
| `testClientOptions` / `anvilOptions` | the options in use |
| `withArtifactsDir(dir)` | base dir for `contractAbi()` / `contractBytecode()` (default `<cwd>/test/artifacts`) |
| `prepare()` | validate anvil **and** test client options + apply to the container, without starting (no Docker needed) |
| `start()` | start, wait for JSON-RPC, set up the test client; throws `AnvilConfigurationError` (before Docker) / `AnvilStartupError` |
| `startRuntime()` | *protected* extension point that starts the prepared container; override it to run anvil elsewhere (e.g. a local binary in tests without Docker, see [examples/test/support/local-anvil.ts](examples/test/support/local-anvil.ts)) — validation, test client and errors stay the library's |

## Test client

Every started node comes with a pre-configured viem test client, and three
ways to use it:

| Layer | Use it for | Example |
|---|---|---|
| `anvil.testClient` | everything viem can do: all **test** actions (`mode: "anvil"`), **public** actions (reads, `simulateContract`, `multicall`, `getLogs`, watchers…), **wallet** actions (`sendTransaction`, `writeContract`, `deployContract`, signing…) plus the [anvil extras](#anvil-extras-anvilactions) | `await anvil.testClient.setCode({ address, bytecode })` |
| `anvil.cheats` | fluent, awaitable chains of state changes (positional arguments, Ether/duration helpers, step-level errors) | `await anvil.cheats.setBalanceEther(a, 10).mine()` |
| `anvil.*` helpers | accounts with keys, transactions with receipts, snapshots/checkpoints, state files, lifecycle | `await anvil.confirm(hash)` |

The client is bound to the node's real chain id (also with `--chain-id` or a
fork), never caches responses (`cacheTime: 0`) and polls every 100 ms.
`anvil.client` is an alias of `anvil.testClient`.

### Configuration (`TestClientOptions`)

```ts
const container = new AnvilContainer(options).withTestClient((client) =>
  client
    .withAccount(0)                 // default account, signed by anvil
    .withTransport("webSocket")     // eth_subscribe-based watchers
    .withPollingInterval(50)
    .withRetries(0)
    .withChain({ name: "Local" })
    .withMulticall3(),              // e.g. when forking mainnet
);
```

| Method | Default | Notes |
|---|---|---|
| `withTransport()` | `"http"` | `"http"` or `"webSocket"` (same port as HTTP) |
| `withPollingInterval()` | 100 ms | watchers, receipt waits |
| `withCacheTime()` | 0 | viem's response cache (e.g. block number) |
| `withTimeout()` | 10 000 ms | per JSON-RPC request |
| `withRetries()` | 3, 150 ms | count and base delay (exponential backoff) |
| `withBatch()` | off | JSON-RPC batching, `true` or `{ batchSize, wait }`; HTTP only |
| `withAccount()` | none | default account **signed by anvil**: dev account index or any address; `{ impersonate: true }` unlocks a non-dev address at startup |
| `withLocalAccount()` | none | default account that **signs locally** (`eth_sendRawTransaction`): dev account index, private key or viem `LocalAccount` |
| `withoutAccount()` | – | removes the default account |
| `withChain()` | `Anvil (<id>)`, ETH | chain metadata: `name`, `nativeCurrency`, `contracts`, `blockExplorers`, `testnet` (id and URLs always come from the node) |
| `withMulticall3()` | – | registers Multicall3 (canonical address by default) for `multicall()` |
| `clone()` / `build()` | – | copy / validated frozen `TestClientConfiguration` |

Setters validate immediately. `prepare()` / `start()` then check the client
against the anvil options **before anything starts**, throwing
`AnvilTestClientConfigurationError` (an `AnvilConfigurationError` with
`setting`, `flag`, `relatedFlags`):

| Rule | Example message |
|---|---|
| Dev account index must exist | `withAccount(): dev account 5 does not exist: anvil is configured with 5 account(s) (account.withAccounts()); use an index from 0 to 4 or raise --accounts` |
| Local signing needs a readable key | generated mnemonic (`--mnemonic-random` / `--mnemonic-seed-unsafe`) + `--quiet` hides the key banner |
| anvil must be able to sign for an address | not a dev account and neither `{ impersonate: true }` nor `--auto-impersonate` |
| Batching needs HTTP | `withBatch()` with `"webSocket"` |

**Typed default account.** `AnvilContainer`, `StartedAnvilContainer` and
`AnvilTestClient` carry the account type: with `withAccount()` /
`withLocalAccount()`, `testClient.sendTransaction({ to, value })` compiles
without `account`; without one, TypeScript requires it.

### viem test actions

Every viem test action is available on `anvil.testClient`; every
state-changing one also has an `anvil.cheats` step.

| viem action | anvil RPC | `cheats` step | Notes |
|---|---|---|---|
| `dropTransaction` | `anvil_dropTransaction` | `dropTransaction()` | |
| `dumpState` | `anvil_dumpState` | – | also `anvil.dumpState()` / `dumpStateToFile()` |
| `getAutomine` | `anvil_getAutomine` | – | also `anvil.getAutomine()` |
| `getTxpoolContent` | `txpool_content` | – | pending / queued transactions by sender and nonce |
| `getTxpoolStatus` | `txpool_status` | – | `{ pending, queued }` counts |
| `impersonateAccount` | `anvil_impersonateAccount` | `impersonate()` | also `anvil.impersonate()` / `withImpersonation()` |
| `increaseTime` | `evm_increaseTime` | `increaseTime()` | seconds or `{ days: 7 }` in `cheats` / `anvil.increaseTime()` |
| `inspectTxpool` | `txpool_inspect` | – | human-readable summary |
| `loadState` | `anvil_loadState` | `loadState()` | merges a dump; also `anvil.loadStateFromFile()`; discards snapshots |
| `mine` | `anvil_mine` | `mine()` | blocks, optional interval |
| `removeBlockTimestampInterval` | `anvil_removeBlockTimestampInterval` | `removeBlockTimestampInterval()` | |
| `reset` | `anvil_reset` | `reset()` | **fixed**: without arguments it resets a non-forked node to genesis (viem's version fails) and re-forks a forked node at its current fork block (a bare `anvil_reset` would detach it from the fork); `{ blockNumber }` / `{ jsonRpcUrl }` re-fork; clears snapshots; also `anvil.reset()` |
| `revert` | `evm_revert` | – | **strict**: throws `SNAPSHOT_NOT_FOUND` instead of silently continuing; also `anvil.revert()` |
| `sendUnsignedTransaction` | `eth_sendUnsignedTransaction` | – | send as any funded address, no key or impersonation (returns the hash) |
| `setAutomine` | `evm_setAutomine` | `setAutomine()` | |
| `setBalance` | `anvil_setBalance` | `setBalance()` / `setBalanceEther()` | wei / Ether |
| `setBlockGasLimit` | `evm_setBlockGasLimit` | `setBlockGasLimit()` | |
| `setBlockTimestampInterval` | `anvil_setBlockTimestampInterval` | `setBlockTimestampInterval()` | fixed seconds between blocks |
| `setCode` | `anvil_setCode` | `setCode()` | runtime bytecode ("etch") |
| `setCoinbase` | `anvil_setCoinbase` | `setCoinbase()` | |
| `setIntervalMining` | `evm_setIntervalMining` | `setIntervalMining()` | `0` turns it off |
| `setLoggingEnabled` | `anvil_setLoggingEnabled` | `setLoggingEnabled()` | |
| `setMinGasPrice` | `anvil_setMinGasPrice` | `setMinGasPrice()` | sets the suggested `eth_gasPrice`; pre-London hardforks only |
| `setNextBlockBaseFeePerGas` | `anvil_setNextBlockBaseFeePerGas` | `setNextBlockBaseFeePerGas()` | |
| `setNextBlockTimestamp` | `evm_setNextBlockTimestamp` | `setNextBlockTimestamp()` | seconds, bigint or `Date` in `cheats` |
| `setNonce` | `anvil_setNonce` | `setNonce()` | |
| `setRpcUrl` | `anvil_setRpcUrl` | `setRpcUrl()` | fork RPC URL |
| `setStorageAt` | `anvil_setStorageAt` | `setStorageAt()` | a `bigint` value is encoded to a 32-byte word in `cheats` |
| `snapshot` | `evm_snapshot` | – | also `anvil.snapshot()` / `checkpoint()` |
| `stopImpersonatingAccount` | `anvil_stopImpersonatingAccount` | `stopImpersonating()` | |

On-chain state reads are public actions: `getBalance`, `getCode`,
`getStorageAt`, `getTransactionCount`, `getBlock`, `readContract`, …

### anvil extras (`AnvilActions`)

anvil RPC methods viem doesn't wrap, added to `testClient` (viem style: one
object argument). `anvilActions` is exported to decorate your own clients:
`createTestClient({ mode: "anvil", … }).extend(anvilActions)`.

| Action | anvil RPC | `cheats` step | Notes |
|---|---|---|---|
| `addBalance()` | `anvil_addBalance` | `addBalance()` | |
| `dealErc20()` | `anvil_dealERC20` | `dealErc20()` | ERC-20 balance of any standard token |
| `setErc20Allowance()` | `anvil_setERC20Allowance` | `setErc20Allowance()` | |
| `setChainId()` | `anvil_setChainId` | `setChainId()` | `anvil.chainId`, `chain` and the container's clients follow |
| `setTime()` | `evm_setTime` | `setTime()` | sets the clock; later blocks continue from it |
| `getIntervalMining()` | `anvil_getIntervalMining` | – | seconds, `undefined` when off |
| `setAutoImpersonate()` | `anvil_autoImpersonateAccount` | `setAutoImpersonate()` | also `anvil.setAutoImpersonate()` |
| `dropAllTransactions()` | `anvil_dropAllTransactions` | `dropAllTransactions()` | |
| `removePoolTransactions()` | `anvil_removePoolTransactions` | `removePoolTransactions()` | all pending transactions of a sender |
| `rollback()` | `anvil_rollback` | `rollback()` | removes the last blocks (default 1) |
| `reorg()` | `anvil_reorg` | – | replaces the last `depth` blocks, optionally with `transactions` |
| `getNodeInfo()` | `anvil_nodeInfo` | – | also `anvil.nodeInfo()` |
| `getMetadata()` | `anvil_metadata` | – | also `anvil.metadata()` |
| `confirmTransaction()` | – | – | receipt; mines first when automine is off; throws `AnvilTransactionRevertedError` (with reason) unless `throwOnRevert: false` |

`reset()` and `revert()` replace viem's versions with the fixed / strict
behaviour described above. Anything else: `anvil.rpc(method, params)`.

### Cheats (fluent)

`anvil.cheats` starts a chain; steps are queued and run in order when the
chain is awaited (or `run()`), once. It is a full promise (`then` / `catch` /
`finally`). Arguments are validated when a step is added; a failing step
rejects with `AnvilTestClientError` `CHEAT_FAILED` naming the step and the
node's reason, and later steps are skipped. `step(fn, label?)` inserts any
client call; `plan` lists the queued steps.

```ts
await anvil.cheats
  .setBalanceEther(whale, 1_000)
  .dealErc20(usdc, whale, 1_000_000n)
  .impersonate(whale)
  .step((c) => c.writeContract({ account: whale, address: usdc, abi, functionName: "transfer", args: [alice, 1n] }))
  .stopImpersonating(whale)
  .increaseTime({ weeks: 1 })
  .mine();
// e.g. "anvil.cheats step 2/3 setMinGasPrice(1n) failed: Invalid parameters were
// provided to the RPC method: anvil_setMinGasPrice is not supported when EIP-1559
// is active (steps 1–1 were applied)"
```

Durations are seconds (`number` / `bigint`) or `{ weeks, days, hours,
minutes, seconds }`; timestamps are seconds or a `Date`.

### Transactions

```ts
const receipt = await anvil.confirm(anvil.testClient.writeContract({ address, abi, functionName: "deposit", value }));
```

`confirm(hash | Promise<hash>, { throwOnRevert?, timeout? })` waits for the
receipt and mines a block first when automine is off (so tests never hang with
`--no-mining`). A reverted transaction throws `AnvilTransactionRevertedError`
with `receipt`, `hash` and the revert `reason` (recovered by replaying the
call). `sendEthTransaction()` and `deployContract()` confirm the same way
but return reverted receipts.

### Multiple accounts

```ts
const bob = anvil.testClientFor(bobAddress);                  // anvil signs
const carol = anvil.testClientFor(privateKeyToAccount(key));  // signs locally
const ws = await anvil.createTestClient((c) => c.withTransport("webSocket").withLocalAccount(2));
```

`testClientFor(account)` returns a client with the same settings acting as
an address (dev or impersonated account) or a viem `LocalAccount`;
`createTestClient(options)` builds one with its own settings, validated like
`withTestClient()`.

### Lifecycle (`useAnvil`)

```ts
const anvil = useAnvil(new AnvilContainer(options).withTestClient((c) => c.withAccount(0)), {
  setup: async (node) => { token = (await node.deployContract(abi, bytecode, deployer)).contractAddress! },
  isolation: "test",   // default: restore the post-setup state after each test
  timeout: 120_000,    // start/stop hook timeout (image pulls)
});
```

`useAnvil(container, settings?)` registers `beforeAll` (start + `setup` +
baseline snapshot), `afterEach` (empty the mempool and restore, with
`isolation: "test"`) and `afterAll` (stop). It returns a handle with the whole `StartedAnvilContainer`
API, usable in tests and hooks; using it at `describe` time throws
`NOT_STARTED`. Hooks are taken from the globals (Jest, Vitest with
`globals: true`, Mocha's `before` / `after`, Jasmine) or passed as
`hooks: { beforeAll, afterAll, afterEach }`. Mocha ignores the hook timeout
argument: raise its timeout (`--timeout 120000`) for container starts.

| Need | API |
|---|---|
| Isolate every test (milliseconds) | `useAnvil()` default, or `const base = await anvil.checkpoint()` + `afterEach(() => base.restore())` |
| Isolate a block of code | `anvil.withSnapshot(async (client) => …)` |
| Back to genesis / the fork block | `anvil.reset()` (clears snapshots: use `isolation: "none"` for such files) |
| Fixtures | `setup`, `loadStateFromFile()`, `state.withLoadState()` |
| Stop | `anvil.stop()` / `await using anvil = await container.start()`; clients then reject with `CONTAINER_STOPPED`; WebSockets are closed |

Snapshots restore the **chain state** (balances, code, storage, blocks,
time), not node settings such as automine / interval mining, impersonation,
block gas limit, coinbase, logging or the chain id — tests that change those
should restore them. Reverting also keeps **pending transactions** (they
would be mined into the next block): `useAnvil` empties the mempool before
each restore; with `checkpoint()` / `withSnapshot()` call
`cheats.dropAllTransactions()` yourself.

### anvil behaviours to know (1.6)

- After `setChainId()`, anvil's own dev-account signer keeps the startup chain
  id, so node-signed transactions fail (`does not match the signer's chain
  ID`). Locally signed (`withLocalAccount()`, `testClientFor(privateKeyToAccount(key))`),
  impersonated and unsigned transactions work.
- `setMinGasPrice()` is rejected while EIP-1559 is active; on older hardforks
  node-signed transactions need an explicit `gasPrice`.

## `StartedAnvilContainer`

| Area | Members |
|---|---|
| Test client | `testClient` (alias `client`), `cheats`, `testClientFor()`, `createTestClient()`, `testClientConfiguration` |
| Connection | `rpcUrl`, `wsUrl`, `chainId`, `chain`, `configuration`, `rpc(method, params)` |
| Accounts | `addresses()`, `accounts()` (with keys), `getBalance()`, `setBalance()`, `setBalanceEther()`, `impersonate()`, `stopImpersonating()`, `withImpersonation()`, `setAutoImpersonate()` |
| Transactions | `confirm()`, `sendEthTransaction()`, `deployContract()` |
| Mining & time | `mine()`, `getAutomine()`, `setAutomine()`, `setIntervalMining()`, `increaseTime()`, `setNextBlockTimestamp()`, `latestTimestamp()` |
| Fees & limits | `setMinGasPrice()`, `setNextBlockBaseFeePerGas()`, `setBlockGasLimit()` |
| State | `snapshot()`, `revert()`, `withSnapshot()`, `checkpoint()`, `reset()`, `dumpState()`, `dumpStateToFile()`, `loadState()`, `loadStateFromFile()` |
| Diagnostics | `nodeInfo()`, `metadata()`, `setLoggingEnabled()`, `logText()` |
| Artifacts | `contractAbi()`, `contractBytecode()` (also `loadContractAbi` / `loadContractBytecode`) |
| Lifecycle | `stop()` – graceful when a dump is configured, copies it to the host, closes the clients; `isStopped` |

## Fast test suites

Starting a container takes about a second; reverting a snapshot takes about a
millisecond. Start **one node per test file** (`useAnvil`) and let it restore
the post-setup state after every test.

- Jest workers run test files in parallel, each with its own node.
- Readiness is detected within ~50 ms of anvil listening; `accounts()` derives
  keys natively in milliseconds.
- `loadState` / `withLoadState` restore prepared fixtures far faster than
  replaying deployments.

## Errors

| Error | When | Fields |
|---|---|---|
| `AnvilConfigurationError` | invalid value, conflict, unmet dependency, missing host file | `flag`, `relatedFlags` |
| `AnvilTestClientConfigurationError` | invalid test client setting, or one that contradicts the anvil options (before start) | `setting`, `flag`, `relatedFlags` |
| `AnvilStartupError` | anvil exited / not ready / Docker failure / default account not resolvable | `command`, `logs`, `cause` |
| `AnvilTestClientError` | runtime misuse, see `code` below | `code`, `cause` |
| `AnvilTransactionRevertedError` | `confirm()` / `confirmTransaction()` of a reverted transaction | `code`, `hash`, `receipt`, `reason` |

| `code` | Meaning |
|---|---|
| `CONTAINER_STOPPED` | the node was stopped; create clients and send requests before `stop()` |
| `SNAPSHOT_NOT_FOUND` | reverting an unknown / already used snapshot, or after `reset()` / `loadState()` |
| `NOT_STARTED` | `useAnvil()` handle used outside tests and hooks |
| `TEST_HOOKS_UNAVAILABLE` | `useAnvil()` found no `beforeAll` / `afterAll` |
| `ACCOUNT_UNAVAILABLE` | the default account could not be resolved on the node |
| `TRANSACTION_REVERTED` | see `AnvilTransactionRevertedError` |
| `CHEAT_FAILED` | a `cheats` step failed (message names the step) |
| `CHEATS_ALREADY_RUN` | a step was added to a chain that already ran |

`ANVIL_TEST_CLIENT_ERROR_CODES` lists the codes with their meaning at runtime.

## Examples

[examples/](examples/README.md) is a separate npm project that uses this
library through `npm link`, like your own project would. Its 15 tested
workflows call every viem test action, every anvil extra and every `cheats`
step against a real anvil: fixtures with per-test isolation, multiple actors
and multicall, time travel and interval mining, custom errors and panics,
whales and impersonation, mempool and block building, WebSocket
subscriptions and filters, `eth_simulateV1` simulations and access lists,
mocking dependencies with `setCode` and state overrides, state fixtures and
custom genesis files, forking, EIP-712 and EIP-7702 signing, chain
configuration and reorgs, node configuration (CORS, EVM limits, CREATE2)
and call tracing.

## Contributing

Scripts, the e2e suite (`pnpm test:e2e`, or `--no-docker` for local testing)
and release steps: see [CONTRIBUTING.md](./CONTRIBUTING.md).

----

Maintained by [Hella Labs](https://hella.website/) · MIT
