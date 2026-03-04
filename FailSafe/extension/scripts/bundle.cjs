const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");

function resetDist() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(distDir, "extension"), { recursive: true });
  fs.mkdirSync(path.join(distDir, "webui"), { recursive: true });
}

function copyDir(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function vendorWhisper() {
  const srcDir = path.join(root, "node_modules", "@xenova", "transformers", "dist");
  const destDir = path.join(root, "src", "roadmap", "ui", "vendor", "whisper");
  const files = ["transformers.min.js", "ort-wasm-simd.wasm", "ort-wasm-simd-threaded.wasm"];

  fs.mkdirSync(destDir, { recursive: true });
  let copied = 0;
  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  if (copied > 0) console.log(`  Vendored ${copied} Whisper file(s)`);
}

async function main() {
  resetDist();

  await esbuild.build({
    entryPoints: [path.join(root, "src", "extension", "main.ts")],
    outfile: path.join(distDir, "extension", "main.js"),
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node20",
    sourcemap: false,
    external: ["vscode", "better-sqlite3"],
    logLevel: "info",
  });

  // Auto-vendor Whisper (Transformers.js) files before UI copy
  vendorWhisper();

  copyDir(
    path.join(root, "src", "roadmap", "ui"),
    path.join(distDir, "extension", "ui"),
  );
  const webuiPages = path.join(root, "src", "webui", "pages");
  if (fs.existsSync(webuiPages)) {
    copyDir(webuiPages, path.join(distDir, "webui", "pages"));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
