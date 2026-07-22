const assert = require("node:assert/strict");
const test = require("node:test");

const { createRegistry } = require("./profile-registry.js");

function profile(id, detectionResult = null) {
  return {
    id,
    label: id,
    detect: () => detectionResult,
    classifyChild: () => "noise",
    diagnose: () => ({})
  };
}

test("detects profiles in registration order", () => {
  const registry = createRegistry();
  registry.register(profile("first-profile", null));
  registry.register(profile("second-profile", { layout: "matched" }));

  const match = registry.detect({}, {});

  assert.equal(match.profile.id, "second-profile");
  assert.deepEqual(match.context, { layout: "matched" });
});

test("rejects duplicate and incomplete profile definitions", () => {
  const registry = createRegistry();
  registry.register(profile("known-profile"));

  assert.throws(
    () => registry.register(profile("known-profile")),
    /Duplicate DOM profile id/
  );
  assert.throws(() => registry.register({ id: "incomplete" }), /missing label/);
});

test("returns a copy of the registered profile list", () => {
  const registry = createRegistry();
  registry.register(profile("stable-profile"));

  const profiles = registry.list();
  profiles.length = 0;

  assert.equal(registry.list().length, 1);
});
