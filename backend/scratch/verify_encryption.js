require("dotenv").config();
const { encrypt, decrypt } = require("../utils/encryption");

console.log("Testing Encryption Utility...");
console.log("----------------------------");

const originalText = "Hello, this is a private message.";
console.log("Original Text:", originalText);

const encrypted = encrypt(originalText);
console.log("Encrypted (to be stored in DB):", encrypted);

const decrypted = decrypt(encrypted);
console.log("Decrypted (for API/UI):", decrypted);

if (originalText === decrypted) {
  console.log("\n✅ SUCCESS: Encryption and decryption match!");
} else {
  console.error("\n❌ FAILURE: Decryption does not match original text.");
}

console.log("\nTesting Fallback (Plain Text)...");
const plainText = "Old plain text message";
const result = decrypt(plainText);
console.log("Result for plain text:", result);

if (result === plainText) {
  console.log("✅ SUCCESS: Fallback handled plain text correctly.");
} else {
  console.error("❌ FAILURE: Fallback failed.");
}

console.log("\nTesting Title Encryption...");
const title = "Emotional Journaling Session";
const encryptedTitle = encrypt(title);
console.log("Encrypted Title:", encryptedTitle);
const decryptedTitle = decrypt(encryptedTitle);
console.log("Decrypted Title:", decryptedTitle);

if (title === decryptedTitle) {
  console.log("✅ SUCCESS: Title encryption/decryption works!");
} else {
  console.error("❌ FAILURE: Title encryption/decryption failed.");
}
