// Cross-Platform Standalone Assets Copier
// Next.js requires .next/static and public to be placed inside .next/standalone/
// This script works identically across Windows, macOS, and Linux without bash 'cp'.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const standaloneDir = path.join(rootDir, ".next", "standalone");
const nextStaticDir = path.join(rootDir, ".next", "static");
const publicDir = path.join(rootDir, "public");

if (!fs.existsSync(standaloneDir)) {
  console.log("ℹ️ .next/standalone does not exist; skipping standalone asset copy.");
  process.exit(0);
}

// 1. Copy .next/static -> .next/standalone/.next/static
const targetStaticDir = path.join(standaloneDir, ".next", "static");
if (fs.existsSync(nextStaticDir)) {
  fs.mkdirSync(path.dirname(targetStaticDir), { recursive: true });
  fs.cpSync(nextStaticDir, targetStaticDir, { recursive: true });
  console.log("✅ Copied .next/static -> .next/standalone/.next/static");
}

// 2. Copy public -> .next/standalone/public
const targetPublicDir = path.join(standaloneDir, "public");
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, targetPublicDir, { recursive: true });
  console.log("✅ Copied public -> .next/standalone/public");
}

console.log("🚀 Standalone deployment package ready in .next/standalone");
