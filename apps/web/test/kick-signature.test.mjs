// Unit test for Kick webhook signature verification.
// Run: npm test   (uses tsx to load the TypeScript module)
import crypto from "node:crypto";
import { verifyEventSignature } from "../src/lib/kick.ts";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = publicKey.export({ type: "spki", format: "pem" }).toString();

const headers = { messageId: "01J8XABC", timestamp: new Date().toISOString(), signature: "" };
const body = JSON.stringify({ is_live: false, title: "test" });
const payload = `${headers.messageId}.${headers.timestamp}.${body}`;
headers.signature = crypto.sign("RSA-SHA256", Buffer.from(payload), privateKey).toString("base64");

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name); }
};

const otherKey = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 })
  .publicKey.export({ type: "spki", format: "pem" }).toString();
const tampered = headers.signature.slice(0, 20) + (headers.signature[20] === "A" ? "B" : "A") + headers.signature.slice(21);

check("valid signature verifies", verifyEventSignature(body, headers, pem) === true);
check("tampered body rejected", verifyEventSignature(body + "x", headers, pem) === false);
check("tampered signature rejected", verifyEventSignature(body, { ...headers, signature: tampered }, pem) === false);
check("missing header rejected", verifyEventSignature(body, { ...headers, messageId: null }, pem) === false);
check("wrong key rejected", verifyEventSignature(body, headers, otherKey) === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
