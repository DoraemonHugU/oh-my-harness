import assert from "node:assert/strict";
import test from "node:test";

import { checkForPackageUpdate, isVersionNewer } from "./runtime.js";

test("isVersionNewer compares stable and prerelease versions", () => {
  assert.equal(isVersionNewer("0.1.0", "0.1.1"), true);
  assert.equal(isVersionNewer("0.1.1", "0.1.1"), false);
  assert.equal(isVersionNewer("0.2.0", "0.1.9"), false);
  assert.equal(isVersionNewer("0.2.0-beta.1", "0.2.0"), true);
  assert.equal(isVersionNewer("0.2.0", "0.2.0-beta.1"), false);
});

test("checkForPackageUpdate returns update command when registry has newer version", async () => {
  const updateInfo = await checkForPackageUpdate(
    "@doraemon-hug-u/oh-my-harness",
    "0.1.1",
    async () =>
      new Response(
        JSON.stringify({
          "dist-tags": {
            latest: "0.2.0",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
  );

  assert.deepEqual(updateInfo, {
    latestVersion: "0.2.0",
    updateCommand: "npm install -g @doraemon-hug-u/oh-my-harness@latest",
  });
});

test("checkForPackageUpdate returns null when already on latest", async () => {
  const updateInfo = await checkForPackageUpdate(
    "@doraemon-hug-u/oh-my-harness",
    "0.2.0",
    async () =>
      new Response(
        JSON.stringify({
          "dist-tags": {
            latest: "0.2.0",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
  );

  assert.equal(updateInfo, null);
});
