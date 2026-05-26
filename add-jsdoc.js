#!/usr/bin/env node
/**
 * Script per aggiungere commenti JSDoc professionali a tutti i metodi
 */

const fs = require('fs');
const path = require('path');

const instructionsDir = './src/instructions';
const files = fs.readdirSync(instructionsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

console.log('📝 Aggiunta commenti JSDoc professionali...\n');

files.forEach(file => {
  const filePath = path.join(instructionsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Pattern per trovare metodi senza JSDoc completo
  const methodPattern = /  \/\*\*\s*\n\s*\*\s+\w+ \([^)]+\) \*\/\s*\n\s*async (\w+)\(ctx: \{([^}]+)\}\): Promise<TransactionInstruction>/g;
  
  content = content.replace(methodPattern, (match, methodName, ctxContent) => {
    // Converti snake_case in camelCase per il nome
    const name = methodName.replace(/_([a-z])/g, (m, c) => c.toUpperCase());
    
    // Estrai parametri dal context
    const params = ctxContent.split(';').map(p => p.trim()).filter(p => p);
    const paramLines = params.map(p => {
      const [paramName, paramType] = p.split(':').map(s => s.trim());
      const type = paramType.replace(/\?.*$/, '').replace(/,$/, '');
      return `   * @param {${type}} ctx.${paramName} - ${paramName.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
    }).join('\n');
    
    return `  /**
   * ${name}
   * @description ${name.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}.
${paramLines}
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async ${methodName}(ctx: {${ctxContent}}): Promise<TransactionInstruction>`;
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ ${file}`);
});

console.log('\n✨ Completato!');
