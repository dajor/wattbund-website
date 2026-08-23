import { createCipheriv, createDecipheriv, randomBytes, randomInt } from "node:crypto";
import type { Coordinates } from "@/lib/types";

const ALGORITHM = "aes-256-gcm";

function keyFromEnvironment() {
  const raw = process.env.LOCATION_ENCRYPTION_KEY;
  if (!raw) throw new Error("LOCATION_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("LOCATION_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export function encryptPrivateLocation(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keyFromEnvironment(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptPrivateLocation(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("Invalid encrypted location");
  const decipher = createDecipheriv(ALGORITHM, keyFromEnvironment(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function createApproximatePoint([longitude, latitude]: Coordinates, distanceMeters?: number, bearingDegrees?: number): Coordinates {
  const distance = distanceMeters ?? randomInt(250, 501);
  const bearing = ((bearingDegrees ?? randomInt(0, 360)) * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const angularDistance = distance / earthRadius;
  const lat1 = (latitude * Math.PI) / 180;
  const lon1 = (longitude * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );
  return [Number(((lon2 * 180) / Math.PI).toFixed(6)), Number(((lat2 * 180) / Math.PI).toFixed(6))];
}
