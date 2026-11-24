/**
 * Deterministic installs: the library, its examples and the lockfiles agree
 * on the versions of viem and testcontainers, and everyone runs the pinned
 * pnpm, so `pnpm gate` behaves the same in the sandbox, in CI and locally.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..", "..");

/** The versions the library, examples and lockfiles must agree on. */
const PINNED = { viem: "2.58.4", testcontainers: "12.2.2" } as const;

function json<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8")) as T;
}

type Manifest = {
  dependencies: Record<string, string>;
  packageManager?: string;
};
type NpmLock = { packages: Record<string, { version?: string }> };

/** Versions pnpm-lock.yaml resolves for the root importer's dependencies. */
function pnpmImporterVersions(): Record<string, string> {
  const lock = fs.readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8");
  const importer = lock.slice(
    lock.indexOf("\n  .:\n"),
    lock.indexOf("\npackages:"),
  );
  return Object.fromEntries(
    [
      ...importer.matchAll(
        /\n {6}'?([^'\s:]+)'?:\n {8}specifier: \S+\n {8}version: ([^(\s]+)/g,
      ),
    ].map(([, name, version]) => [name, version]),
  );
}

describe("dependency pins", () => {
  const root = json<Manifest>("package.json");
  const examples = json<Manifest>("examples/package.json");
  const examplesLock = json<NpmLock>("examples/package-lock.json");
  const resolved = pnpmImporterVersions();

  it("the library resolves the pinned viem and testcontainers", () => {
    expect(root.dependencies.viem).toBe(`^${PINNED.viem}`);
    expect(root.dependencies.testcontainers).toBe(`^${PINNED.testcontainers}`);
    expect(resolved.viem).toBe(PINNED.viem);
    expect(resolved.testcontainers).toBe(PINNED.testcontainers);
  });

  it("the examples use the same versions as the library", () => {
    expect(examples.dependencies.viem).toBe(PINNED.viem);
    expect(examplesLock.packages["node_modules/viem"].version).toBe(
      PINNED.viem,
    );
    expect(examplesLock.packages["node_modules/testcontainers"].version).toBe(
      PINNED.testcontainers,
    );
  });

  it("runs under the pinned pnpm", () => {
    expect(root.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
    // Set when the tests run through pnpm (`pnpm test:unit`, `pnpm gate`).
    const agent = /\bpnpm\/(\S+)/.exec(process.env.npm_config_user_agent ?? "");
    if (agent) expect(`pnpm@${agent[1]}`).toBe(root.packageManager);
  });
});
