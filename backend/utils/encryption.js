const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;
const KEY = process.env.ENCRYPTION_KEY;

/**
 * Encrypts a text string using AES-256-GCM.
 * Returns a string in format: iv:authTag:encryptedData (all in hex)
 */
function encrypt(text) {
  if (!text) return text;
  if (!KEY) {
    console.error("ENCRYPTION_KEY is not defined in environment variables!");
    return text;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, "hex"), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string in format: iv:authTag:encryptedData.
 * If decryption fails or format is wrong, returns the original text (fallback for plain text).
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  if (!KEY) return encryptedText;

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return encryptedText; // Not our encrypted format

    const [ivHex, authTagHex, encryptedData] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY, "hex"), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    // console.error("Decryption failed, returning plain text:", error.message);
    return encryptedText; // Fallback for existing plain text data
  }
}

module.exports = { encrypt, decrypt };
