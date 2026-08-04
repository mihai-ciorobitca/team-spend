const ALGORITHM = "pbkdf2-sha256";
const ITERATIONS = 210_000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export function isValidMemberPassword(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
}

export async function hashMemberPassword(password: string) {
  if (!isValidMemberPassword(password)) throw new Error("Member passwords must be 8 to 128 characters");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `${ALGORITHM}$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

export async function verifyMemberPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash || !isValidMemberPassword(password)) return false;
  const [algorithm, iterationsValue, saltValue, expectedValue] = storedHash.split("$");
  const iterations = Number(iterationsValue);
  const salt = hexToBytes(saltValue ?? "");
  if (algorithm !== ALGORITHM || !Number.isInteger(iterations) || iterations < 100_000 || !salt || !expectedValue) return false;

  const actualValue = bytesToHex(await derive(password, salt, iterations));
  if (actualValue.length !== expectedValue.length) return false;
  let difference = 0;
  for (let index = 0; index < actualValue.length; index += 1) {
    difference |= actualValue.charCodeAt(index) ^ expectedValue.charCodeAt(index);
  }
  return difference === 0;
}
