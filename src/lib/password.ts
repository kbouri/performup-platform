/**
 * Password hashing utility using Better Auth's scrypt format
 * Better Auth uses scrypt with specific config: N=16384, r=16, p=1, dkLen=64
 * Format: salt:key (both in hexadecimal)
 */

import { scrypt } from "@noble/hashes/scrypt.js";
import { randomBytes } from "crypto";

// Better Auth scrypt config
const SCRYPT_CONFIG = {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
};

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Hash a password using Better Auth's scrypt format
 * @param password The plain text password to hash
 * @returns The hashed password in format "salt:key" (hex)
 */
export function hashPassword(password: string): string {
    // Generate random 16-byte salt
    const saltBytes = randomBytes(16);
    const salt = bytesToHex(new Uint8Array(saltBytes));

    // Generate key using scrypt
    const key = scrypt(password.normalize("NFKC"), salt, {
        N: SCRYPT_CONFIG.N,
        p: SCRYPT_CONFIG.p,
        r: SCRYPT_CONFIG.r,
        dkLen: SCRYPT_CONFIG.dkLen,
    });

    return `${salt}:${bytesToHex(key)}`;
}

/**
 * Verify a password against a Better Auth scrypt hash
 * @param password The plain text password to verify
 * @param hash The stored hash in format "salt:key"
 * @returns True if password matches
 */
export function verifyPassword(password: string, hash: string): boolean {
    const [salt, storedKey] = hash.split(":");
    if (!salt || !storedKey) {
        return false;
    }

    const key = scrypt(password.normalize("NFKC"), salt, {
        N: SCRYPT_CONFIG.N,
        p: SCRYPT_CONFIG.p,
        r: SCRYPT_CONFIG.r,
        dkLen: SCRYPT_CONFIG.dkLen,
    });

    return bytesToHex(key) === storedKey;
}
