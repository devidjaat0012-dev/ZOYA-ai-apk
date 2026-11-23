import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const distDir = path.join(rootDir, "dist");
const publicDir = path.join(rootDir, "public");
const androidAssetsWwwDir = path.join(rootDir, "android", "app", "src", "main", "assets", "www");
const androidResDir = path.join(rootDir, "android", "app", "src", "main", "res");

// 1. Sync Vite production build (dist/) -> android/app/src/main/assets/www/
if (fs.existsSync(distDir)) {
  fs.rmSync(androidAssetsWwwDir, { recursive: true, force: true });
  fs.mkdirSync(androidAssetsWwwDir, { recursive: true });
  fs.cpSync(distDir, androidAssetsWwwDir, {
    recursive: true,
    filter: (src) => {
      // Never bundle oversized standalone APK binaries inside the APK's own assets
      return !src.endsWith(".apk");
    },
  });
  console.log(`Synced web bundle to ${path.relative(rootDir, androidAssetsWwwDir)}`);
} else {
  console.warn("dist/ not found. Run 'npm run build' before syncing Android web assets.");
}

// 2. Sync launcher PNG icons from public/ into android mipmap-* directories
const icon192 = path.join(publicDir, "pwa-192x192.png");
const icon512 = path.join(publicDir, "pwa-512x512.png");

const densityMap = [
  { folder: "mipmap-mdpi", src: icon192 },
  { folder: "mipmap-hdpi", src: icon192 },
  { folder: "mipmap-xhdpi", src: icon192 },
  { folder: "mipmap-xxhdpi", src: icon512 },
  { folder: "mipmap-xxxhdpi", src: icon512 },
];

for (const { folder, src } of densityMap) {
  if (!fs.existsSync(src)) continue;
  const targetDir = path.join(androidResDir, folder);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(src, path.join(targetDir, "ic_launcher.png"));
  fs.copyFileSync(src, path.join(targetDir, "ic_launcher_round.png"));
}

console.log("Synced Android launcher icons into mipmap-* folders.");
