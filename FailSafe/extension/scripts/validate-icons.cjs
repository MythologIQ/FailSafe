/**
 * Validate that all icon references in package.json resolve to real files.
 * Run: node scripts/validate-icons.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkg = require(path.join(root, "package.json"));
const errors = [];

function check(label, iconPath) {
  if (!iconPath) return;
  const full = path.resolve(root, iconPath);
  if (!fs.existsSync(full)) {
    errors.push(`${label}: ${iconPath} (resolved: ${full})`);
  }
}

// Main extension icon
check("Extension icon", pkg.icon);

// Activity bar container icons
const containers = pkg.contributes?.viewsContainers?.activitybar || [];
containers.forEach((c) => check(`Activity bar "${c.title}"`, c.icon));

// View icons
const views = pkg.contributes?.views || {};
Object.entries(views).forEach(([container, viewList]) => {
  viewList.forEach((v) => check(`View "${v.name}" in ${container}`, v.icon));
});

if (errors.length) {
  console.error("[FAIL] Missing icon files referenced in package.json:");
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
} else {
  console.log("[PASS] All icon references in package.json resolve to real files");
}
