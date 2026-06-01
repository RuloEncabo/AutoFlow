import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const blockedFiles = ["_redirects"];

for (const fileName of blockedFiles) {
  const filePath = resolve(process.cwd(), "dist", fileName);
  if (existsSync(filePath)) {
    rmSync(filePath, { force: true });
    console.log(`Removed Cloudflare-incompatible asset: dist/${fileName}`);
  }
}
