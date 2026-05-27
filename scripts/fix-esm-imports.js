#!/usr/bin/env node
/**
 * Post-build script: Add .js extensions to ESM imports
 */

import { execSync } from 'child_process';

console.log('🔧 Adding .js extensions to ESM imports...\n');

// Fix DIRECTORY imports: from './dir' → from './dir/index.js'
const dirs = ['constants', 'pdas', 'accounts', 'events', 'instructions', 'utils', 'errors', 'registries', 'modules'];

for (const dir of dirs) {
  try {
    execSync(`find dist/esm -name "*.js" -exec sed -i '' "s/from '\\.\\/${dir}'/from '\\.\\/${dir}\\/index.js'/g" {} \\;`);
    console.log(`✓ Fixed: ./${dir} → ./${dir}/index.js`);
  } catch (e) {
    // Ignore errors
  }
}

// Fix FILE imports: from './file' → from './file.js'
const files = ['client', 'idlTypes'];

for (const file of files) {
  try {
    execSync(`find dist/esm -name "*.js" -exec sed -i '' "s/from '\\.\\/${file}'/from '\\.\\/${file}.js'/g" {} \\;`);
    console.log(`✓ Fixed: ./${file} → ./${file}.js`);
  } catch (e) {
    // Ignore errors
  }
}

// Also fix CJS (directories only, CJS doesn't need .js for files)
for (const dir of dirs) {
  try {
    execSync(`find dist/cjs -name "*.js" -exec sed -i '' "s/from '\\.\\/${dir}'/from '\\.\\/${dir}\\/index.js'/g" {} \\;`);
    console.log(`✓ Fixed (CJS): ./${dir} → ./${dir}/index.js`);
  } catch (e) {
    // Ignore errors
  }
}

console.log('\n✅ Done!');

console.log('\n✅ Done! (idlTypes excluded - it is a file, not a directory)');
