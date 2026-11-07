import fs from "fs";
import path from "path";
import sharp from "sharp";

async function generateIcons() {
  const publicDir = path.join(process.cwd(), "public");
  const svgPath = path.join(publicDir, "favicon.svg");

  if (!fs.existsSync(svgPath)) {
    console.error("favicon.svg not found!");
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. Generate 32x32 PNG
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), png32);
  console.log("Generated favicon-32x32.png");

  // 2. Generate 16x16 PNG
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "favicon-16x16.png"), png16);
  console.log("Generated favicon-16x16.png");

  // 3. Generate Apple Touch Icon 180x180
  const appleTouch = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleTouch);
  console.log("Generated apple-touch-icon.png");

  // 4. Generate PWA icon 192x192
  const pwa192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "icon-192.png"), pwa192);
  console.log("Generated icon-192.png");

  // 5. Generate PWA icon 512x512
  const pwa512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "icon-512.png"), pwa512);
  console.log("Generated icon-512.png");

  // 6. Generate favicon.ico (using 32x32 PNG buffer which all modern browsers and OS support)
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), png32);
  console.log("Generated favicon.ico");

  // Also copy to src/app/ for Next.js App Router conventions
  const appDir = path.join(process.cwd(), "src", "app");
  fs.writeFileSync(path.join(appDir, "favicon.ico"), png32);
  fs.writeFileSync(path.join(appDir, "icon.png"), png32);
  fs.writeFileSync(path.join(appDir, "apple-icon.png"), appleTouch);
  console.log("Copied app-level favicon.ico, icon.png, apple-icon.png into src/app/");
}

generateIcons().catch(console.error);
