import crypto from "node:crypto";

/**
 * Verifies password against ASP.NET Core Identity password hash (V2 or V3).
 */
export function verifyPassword(
  password: string,
  hashedPasswordBase64: string,
): boolean {
  try {
    const decoded = Buffer.from(hashedPasswordBase64, "base64");
    if (decoded.length === 0) return false;

    const version = decoded[0];

    // ASP.NET Core Identity V3
    if (version === 0x01) {
      if (decoded.length < 13) return false;

      const prf = decoded.readUInt32BE(1);
      const iterCount = decoded.readUInt32BE(5);
      const saltLength = decoded.readUInt32BE(9);

      if (saltLength < 16 || decoded.length < 13 + saltLength) return false;

      const salt = decoded.subarray(13, 13 + saltLength);
      const expectedSubkey = decoded.subarray(13 + saltLength);
      const subkeyLength = expectedSubkey.length;

      let digest = "sha256";
      if (prf === 0) {
        digest = "sha1";
      } else if (prf === 1) {
        digest = "sha256";
      } else if (prf === 2) {
        digest = "sha512";
      }

      const actualSubkey = crypto.pbkdf2Sync(
        password,
        salt,
        iterCount,
        subkeyLength,
        digest,
      );

      return crypto.timingSafeEqual(expectedSubkey, actualSubkey);
    }

    // ASP.NET Core Identity V2
    if (version === 0x00) {
      if (decoded.length !== 1 + 16 + 32) return false;

      const salt = decoded.subarray(1, 17);
      const expectedSubkey = decoded.subarray(17, 49);
      const actualSubkey = crypto.pbkdf2Sync(password, salt, 1000, 32, "sha1");

      return crypto.timingSafeEqual(expectedSubkey, actualSubkey);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Hashes password in ASP.NET Core Identity V3 format (PBKDF2 HMAC-SHA256, 100,000 iterations).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const iterCount = 100000;
  const subkeyLength = 32;

  const subkey = crypto.pbkdf2Sync(
    password,
    salt,
    iterCount,
    subkeyLength,
    "sha256",
  );

  const buffer = Buffer.alloc(1 + 4 + 4 + 4 + salt.length + subkeyLength);
  buffer[0] = 0x01; // Format marker: V3
  buffer.writeUInt32BE(1, 1); // PRF: HMAC-SHA256
  buffer.writeUInt32BE(iterCount, 5); // Iterations
  buffer.writeUInt32BE(salt.length, 9); // Salt length (16 bytes)
  salt.copy(buffer, 13);
  subkey.copy(buffer, 13 + salt.length);

  return buffer.toString("base64");
}
