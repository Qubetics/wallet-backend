export const REQUIRED_SECRETS: string[] = [
  "FIREBASE_SERVICE_ACCOUNT",
  "RSA_KEYS.USER.PRIVATE",
  "RSA_KEYS.USER.PUBLIC",
  "RSA_KEYS.ADMIN.PRIVATE",
  "RSA_KEYS.ADMIN.PUBLIC",
  "ALCHEMY_SOLANA_KEY",
  "SWAGGER_AUTH.USER",
  "SWAGGER_AUTH.PASS",
  "CMC_ROTATION_KEYS",
];

export function assertRequiredSecrets(cfg: any, required: string[]): void {
  const missing = required.filter((path) => {
    const value = path.split(".").reduce((obj: any, k: string) => (obj == null ? undefined : obj[k]), cfg);
    return value === undefined || value === null || value === "";
  });
  if (missing.length) {
    throw new Error(`Missing ZooKeeper config keys: ${missing.join(", ")}`);
  }
}
