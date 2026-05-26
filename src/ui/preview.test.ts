import test from "node:test";
import assert from "node:assert/strict";

import { buildPreviewSections } from "./preview.js";

test("buildPreviewSections groups by action kind and truncates per section", () => {
  const sections = buildPreviewSections(
    [
      { kind: "created", target: "a" },
      { kind: "created", target: "b" },
      { kind: "created", target: "c" },
      { kind: "patched", target: "p1" },
      { kind: "patched", target: "p2" },
    ],
    "zh",
    2,
  );

  assert.equal(sections.length, 2);
  assert.equal(sections[0]?.kind, "created");
  assert.deepEqual(
    sections[0]?.entries.map((entry) => entry.target),
    ["a", "b"],
  );
  assert.equal(sections[0]?.remainingCount, 1);
  assert.equal(sections[1]?.kind, "patched");
  assert.equal(sections[1]?.remainingCount, 0);
});
