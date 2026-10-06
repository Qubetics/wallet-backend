const test = require("node:test");
const assert = require("node:assert");
const { assertRequiredSecrets } = require("../build/config/required-secrets");

const full = {
  FIREBASE_SERVICE_ACCOUNT: { private_key: "x" },
  RSA_KEYS: { USER: { PRIVATE: "a", PUBLIC: "b" }, ADMIN: { PRIVATE: "c", PUBLIC: "d" } },
  SSL: { KEY: "k", CERT: "c" },
};
const KEYS = ["FIREBASE_SERVICE_ACCOUNT", "RSA_KEYS.USER.PRIVATE", "RSA_KEYS.USER.PUBLIC",
  "RSA_KEYS.ADMIN.PRIVATE", "RSA_KEYS.ADMIN.PUBLIC", "SSL.KEY", "SSL.CERT"];

test("passes when every key is present", () => {
  assert.doesNotThrow(() => assertRequiredSecrets(full, KEYS));
});

test("lists every missing key in one error", () => {
  const cfg = { ...full, SSL: { KEY: "" }, RSA_KEYS: { USER: { PRIVATE: "a" } } };
  assert.throws(() => assertRequiredSecrets(cfg, KEYS), {
    message: "Missing ZooKeeper config keys: RSA_KEYS.USER.PUBLIC, RSA_KEYS.ADMIN.PRIVATE, RSA_KEYS.ADMIN.PUBLIC, SSL.KEY, SSL.CERT",
  });
});

test("treats an empty config as all missing", () => {
  assert.throws(() => assertRequiredSecrets({}, ["SSL.KEY"]), /SSL\.KEY/);
});

test("requires the Alchemy key and Swagger login moved out of source", () => {
  const { REQUIRED_SECRETS } = require("../build/config/required-secrets");
  for (const k of ["ALCHEMY_SOLANA_KEY", "SWAGGER_AUTH.USER", "SWAGGER_AUTH.PASS"]) {
    assert.ok(REQUIRED_SECRETS.includes(k), k);
  }
});

test("no source file still carries a redacted placeholder", () => {
  const { execSync } = require("child_process");
  const hits = execSync("git grep -n REDACTED -- src || true", { encoding: "utf8" }).trim();
  assert.strictEqual(hits, "");
});
