// End-to-end encryption using ECDH key exchange + AES-GCM

const ALGORITHM = "AES-GCM";
const KEY_ALGO = { name: "ECDH", namedCurve: "P-256" };
const STORAGE_KEY = "viewza_e2e_private_key";

// Generate ECDH key pair
export async function generateKeyPair(): Promise<{ publicKey: string; privateKeyJwk: JsonWebKey }> {
  const keyPair = await crypto.subtle.generateKey(KEY_ALGO, true, ["deriveBits"]);
  
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyB64 = arrayBufferToBase64(publicKeyRaw);
  
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  
  return { publicKey: publicKeyB64, privateKeyJwk };
}

// Store private key in localStorage
export function storePrivateKey(jwk: JsonWebKey) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jwk));
}

// Get stored private key
export function getStoredPrivateKey(): JsonWebKey | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Import a public key from base64
async function importPublicKey(publicKeyB64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(publicKeyB64);
  return crypto.subtle.importKey("raw", raw, KEY_ALGO, false, []);
}

// Import a private key from JWK
async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, KEY_ALGO, false, ["deriveBits"]);
}

// Derive shared AES key from own private key + other's public key
async function deriveSharedKey(privateKeyJwk: JsonWebKey, otherPublicKeyB64: string): Promise<CryptoKey> {
  const privateKey = await importPrivateKey(privateKeyJwk);
  const publicKey = await importPublicKey(otherPublicKeyB64);
  
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );
  
  return crypto.subtle.importKey("raw", sharedBits, { name: ALGORITHM }, false, ["encrypt", "decrypt"]);
}

// Encrypt a message
export async function encryptMessage(
  plaintext: string,
  privateKeyJwk: JsonWebKey,
  otherPublicKeyB64: string
): Promise<string> {
  const sharedKey = await deriveSharedKey(privateKeyJwk, otherPublicKeyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    sharedKey,
    encoded
  );
  
  // Concatenate IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return arrayBufferToBase64(combined.buffer);
}

// Decrypt a message
export async function decryptMessage(
  encryptedB64: string,
  privateKeyJwk: JsonWebKey,
  otherPublicKeyB64: string
): Promise<string> {
  const sharedKey = await deriveSharedKey(privateKeyJwk, otherPublicKeyB64);
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedB64));
  
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    sharedKey,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

// Utility: ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility: base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
