import { scryptSync, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt";
const HASH_BYTES = 64;

export function verifyAdminPassword(password: string, encodedHash: string | undefined) {
  if (!encodedHash || !password) return false;

  const [prefix, saltHex, expectedHex] = encodedHash.split(":");
  if (prefix !== HASH_PREFIX || !saltHex || !expectedHex) return false;

  try {
    const expected = Buffer.from(expectedHex, "hex");
    if (expected.length !== HASH_BYTES) return false;

    const actual = scryptSync(password, Buffer.from(saltHex, "hex"), HASH_BYTES);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
