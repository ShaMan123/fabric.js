const path = require('path');
const fs = require('fs-extra');
const babel = require("@babel/core");

/**
 * https://babeljs.io/docs/en/babel-preset-typescript#via-node-api
 */
function transformTS(filePath) {
  const data = babel.transformSync(fs.readFileSync(filePath).toString(), {
    presets: ["@babel/preset-typescript"],
    filename: filePath
  });
  return data.code;
}

const EXT = { ts: 'js', tsx: 'jsx' };

function changeExtension(file) {
  const ext = path.extname(file);
  const basename = path.basename(file, ext);
  return path.join(path.dirname(file), `${basename}.${EXT[ext.slice(1)]}`);
}

function transformTSTraversal(folderPath) {
  const files = {};
  const traverse = (fileName) => {
    const fileExt = path.extname(fileName).slice(1);
    if (fs.lstatSync(fileName).isDirectory()) {
      fs.readdirSync(fileName)
        .forEach(file => {
          traverse(path.join(fileName, file));
        });
    } else if (Object.keys(EXT).some(ext => ext === fileExt) && !fileName.endsWith('.d.ts')) {
      files[changeExtension(path.relative(folderPath, fileName))] = transformTS(fileName);
    }
  }
  traverse(folderPath);
  return files;
}


const srcDir = path.resolve(__dirname, "ts");
const destDir = path.resolve(__dirname, "js");
const files = transformTSTraversal(srcDir);

const BLACKLIST = [
  'package.json',
  'README.md'
]

fs.copySync(srcDir, destDir, {
  filter: (src, dest) => {
    if (BLACKLIST.some(p => p.endsWith(path.basename(src)))) return false;
    const fileExt = path.extname(src).slice(1);
    return Object.keys(EXT).every(ext => ext !== fileExt) || src.endsWith('.d.ts');
  }
});
for (const fileName in files) {
  const dest = path.resolve(destDir, fileName);
  fs.ensureFileSync(dest, files[fileName]);
  fs.writeFileSync(dest, files[fileName]);
}