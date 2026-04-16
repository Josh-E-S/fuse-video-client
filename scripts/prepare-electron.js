const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

// Copy static assets into the standalone output
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[prepare] Copying static assets into standalone...');
copyDir(
  path.join(root, '.next', 'static'),
  path.join(standalone, '.next', 'static')
);
copyDir(
  path.join(root, 'public'),
  path.join(standalone, 'public')
);

// Remove sharp and related image optimization deps (not used, saves ~16MB)
const sharpDirs = ['sharp', '@img'];
for (const dir of sharpDirs) {
  const target = path.join(standalone, 'node_modules', dir);
  if (fs.existsSync(target)) {
    console.log(`[prepare] Removing ${dir} from standalone...`);
    fs.rmSync(target, { recursive: true, force: true });
  }
}

// Remove typescript from standalone (dev tool, not needed at runtime, saves ~19MB)
const tsDir = path.join(standalone, 'node_modules', 'typescript');
if (fs.existsSync(tsDir)) {
  console.log('[prepare] Removing typescript from standalone...');
  fs.rmSync(tsDir, { recursive: true, force: true });
}

// Copy sherpa-onnx-node and its platform binary into standalone so the
// electron main process can require() it from the unpacked asar path
const sherpaNodeSrc = path.join(root, 'node_modules', 'sherpa-onnx-node');
const sherpaNodeDest = path.join(standalone, 'node_modules', 'sherpa-onnx-node');
if (fs.existsSync(sherpaNodeSrc) && !fs.existsSync(sherpaNodeDest)) {
  console.log('[prepare] Copying sherpa-onnx-node into standalone...');
  copyDir(sherpaNodeSrc, sherpaNodeDest);
}

// Find and copy the platform-specific sherpa binary
const platformBinaries = fs.readdirSync(path.join(root, 'node_modules'))
  .filter(d => d.startsWith('sherpa-onnx-darwin-') || d.startsWith('sherpa-onnx-linux-') || d.startsWith('sherpa-onnx-win'));

for (const bin of platformBinaries) {
  const src = path.join(root, 'node_modules', bin);
  const dest = path.join(standalone, 'node_modules', bin);
  if (!fs.existsSync(dest)) {
    console.log(`[prepare] Copying ${bin} into standalone...`);
    copyDir(src, dest);
  }
}

console.log('[prepare] Done.');
