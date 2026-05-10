import crypto from "crypto";

/**
 * Hash a password using PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha256")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const [salt, storedHash] = hash.split(":");
  const computedHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha256")
    .toString("hex");
  return computedHash === storedHash;
}

/**
 * Check if authentication bypass is active
 */
export function isAuthDisabled(): boolean {
  const authDisabled = String(process.env.AUTH_DISABLED || "").trim().toLowerCase();
  const viteAuthDisabled = String(process.env.VITE_AUTH_DISABLED || "").trim().toLowerCase();
  return authDisabled === "true" || viteAuthDisabled === "true";
}
