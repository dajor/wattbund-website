import { scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyAdminPassword } from "./admin-password";

function hash(password: string) {
  const salt = Buffer.from("0123456789abcdef", "utf8");
  return `scrypt:${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

describe("verifyAdminPassword", () => {
  it("accepts the configured password", () => {
    expect(verifyAdminPassword("correct horse", hash("correct horse"))).toBe(true);
  });

  it("rejects incorrect passwords and malformed hashes", () => {
    expect(verifyAdminPassword("wrong", hash("correct horse"))).toBe(false);
    expect(verifyAdminPassword("anything", "invalid")).toBe(false);
    expect(verifyAdminPassword("anything", undefined)).toBe(false);
  });
});
