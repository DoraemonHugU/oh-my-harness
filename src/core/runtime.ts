import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PACKAGE_ROOT = path.resolve(__dirname, "../..");
export const PACKAGE_JSON_PATH = path.join(PACKAGE_ROOT, "package.json");
export const TEMPLATE_REPO_ROOT = path.join(PACKAGE_ROOT, "templates", "repo");
export const SKILLS_SOURCE_ROOT = path.join(PACKAGE_ROOT, "plugin", "skills");
export const CONFIG_TOML_SOURCE = path.join(PACKAGE_ROOT, "config.toml");
export const AGENTS_SOURCE_ROOT = path.join(PACKAGE_ROOT, "agents");
export const SOURCE_CODEX_HOME_PREFIX = "__OH_MY_HARNESS_CODEX_HOME__/";
export const GITIGNORE_BEGIN = "# oh-my-harness:begin";
export const GITIGNORE_END = "# oh-my-harness:end";

export type PackageMetadata = {
  name: string;
  version: string;
};

export type PackageUpdateInfo = {
  latestVersion: string;
  updateCommand: string;
};

export async function readPackageMetadata(): Promise<PackageMetadata> {
  const packageJson = JSON.parse(
    await fs.readFile(PACKAGE_JSON_PATH, "utf8"),
  ) as { name?: string; version?: string };

  return {
    name: packageJson.name ?? "unknown",
    version: packageJson.version ?? "unknown",
  };
}

export async function readPackageVersion(): Promise<string> {
  return (await readPackageMetadata()).version;
}

function compareCoreVersions(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    if (leftPart > rightPart) {
      return 1;
    }
    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

function parseVersionParts(version: string): {
  core: number[];
  prerelease: string | null;
} | null {
  const trimmed = version.trim();
  if (!trimmed) {
    return null;
  }

  const [corePart, prereleasePart] = trimmed.split("-", 2);
  if (!corePart) {
    return null;
  }

  const core = corePart.split(".").map((part) => Number.parseInt(part, 10));
  if (core.some((part) => Number.isNaN(part))) {
    return null;
  }

  return {
    core,
    prerelease: prereleasePart ?? null,
  };
}

export function isVersionNewer(currentVersion: string, latestVersion: string): boolean {
  const current = parseVersionParts(currentVersion);
  const latest = parseVersionParts(latestVersion);
  if (!current || !latest) {
    return false;
  }

  const coreComparison = compareCoreVersions(current.core, latest.core);
  if (coreComparison < 0) {
    return true;
  }
  if (coreComparison > 0) {
    return false;
  }

  if (current.prerelease && !latest.prerelease) {
    return true;
  }

  return false;
}

export async function checkForPackageUpdate(
  packageName: string,
  currentVersion: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PackageUpdateInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, 1500);

  try {
    const response = await fetchImpl(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
      {
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as {
      "dist-tags"?: {
        latest?: string;
      };
    };
    const latestVersion = payload["dist-tags"]?.latest;
    if (!latestVersion || !isVersionNewer(currentVersion, latestVersion)) {
      return null;
    }

    return {
      latestVersion,
      updateCommand: `npm install -g ${packageName}@latest`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
