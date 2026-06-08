#!/usr/bin/env node
/**
 * Post-build script: Add .js extensions to ESM imports
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'fs';
import path from 'path';

console.log('🔧 Adding .js extensions to ESM imports...\n');

function listJsFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    return statSync(fullPath).isDirectory() ? listJsFiles(fullPath) : [fullPath];
  });
  return entries.filter((entry) => entry.endsWith('.js'));
}

function resolveEsmSpecifier(filePath, specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return specifier;
  if (/\.(js|json|node|wasm)$/.test(specifier)) return specifier;

  const basePath = path.resolve(path.dirname(filePath), specifier);
  if (existsSync(`${basePath}.js`)) return `${specifier}.js`;
  if (existsSync(path.join(basePath, 'index.js'))) return `${specifier}/index.js`;
  if (existsSync(`${basePath}.json`)) return `${specifier}.json`;
  return specifier;
}

function toDestructuredBinding(importList) {
  return importList
    .split(',')
    .map((binding) => binding.trim())
    .filter(Boolean)
    .map((binding) => binding.replace(/\s+as\s+/g, ': '))
    .join(', ');
}

let fixedImports = 0;
let fixedAnchorImports = 0;
for (const filePath of listJsFiles('dist/esm')) {
  const original = readFileSync(filePath, 'utf8');
  let next = original.replace(
    /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
    (match, prefix, specifier, suffix) => {
      const resolved = resolveEsmSpecifier(filePath, specifier);
      if (resolved !== specifier) fixedImports += 1;
      return `${prefix}${resolved}${suffix}`;
    },
  );
  next = next.replace(
    /(\bimport\s+['"])(\.\.?\/[^'"]+)(['"])/g,
    (match, prefix, specifier, suffix) => {
      const resolved = resolveEsmSpecifier(filePath, specifier);
      if (resolved !== specifier) fixedImports += 1;
      return `${prefix}${resolved}${suffix}`;
    },
  );
  next = next.replace(
    /import\s+\{\s*([^}]+?)\s*\}\s+from\s+['"]@coral-xyz\/anchor['"];?/g,
    (match, importList) => {
      fixedAnchorImports += 1;
      return [
        'import __anchor from "@coral-xyz/anchor";',
        `const { ${toDestructuredBinding(importList)} } = __anchor;`,
      ].join('\n');
    },
  );
  if (next !== original) writeFileSync(filePath, next);
}

console.log(`✓ Fixed ${fixedImports} ESM relative import specifiers`);
console.log(`✓ Rewrote ${fixedAnchorImports} Anchor CJS named imports`);

console.log('\n✅ Done!');

mkdirSync('dist/cjs', { recursive: true });
writeFileSync('dist/cjs/package.json', '{ "type": "commonjs" }\n');
console.log('✓ Added dist/cjs/package.json for CommonJS consumers');

console.log('\n✅ Done! (idlTypes excluded - it is a file, not a directory)');
