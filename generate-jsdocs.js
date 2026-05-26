#!/usr/bin/env node
/**
 * Genera automaticamente commenti JSDoc professionali per tutti i metodi
 */

const fs = require('fs');
const path = require('path');

const instructionsDir = './src/instructions';
const files = fs.readdirSync(instructionsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

// Mappa dei nomi dei metodi con descrizioni professionali
const methodDescriptions = {
  // Agent
  closeAgent: 'Permanently closes an agent PDA, transferring remaining rent to the wallet',
  deactivateAgent: 'Sets agent is_active flag to false, hiding it from discovery indexes',
  reactivateAgent: 'Sets agent is_active flag back to true, restoring visibility in indexes',
  registerAgent: 'Creates a new agent PDA with metadata, capabilities, pricing, and protocols',
  updateAgent: 'Partially updates agent fields; null values remain unchanged',
  reportCalls: 'Updates agent stats with cumulative calls served count',
  updateReputation: 'Updates agent\'s average latency and uptime percentage',
  
  // Escrow
  closeEscrowV2: 'Permanently closes an escrow V2 PDA, transferring remaining rent to the depositor',
  createEscrowV2: 'Initializes an escrow V2 PDA with pricing, volume curve, and dispute configuration',
  depositEscrowV2: 'Adds lamports or SPL tokens to an existing escrow V2 PDA',
  finalizeSettlement: 'Transfers funds from escrow to agent wallet after dispute window expires',
  settleCallsV2: 'Records served calls and creates a settlement receipt for the agent',
  withdrawEscrowV2: 'Allows depositor to withdraw available balance from escrow before settlement',
  migrateEscrowV1ToV2: 'Migrates an existing escrow V1 account to the V2 schema with enhanced features',
  settleBatch: 'Processes multiple settlement entries in a single transaction for high-volume merchants',
  
  // Tools
  closeTool: 'Permanently closes a tool PDA, transferring remaining rent to the wallet',
  closeToolCategoryIndex: 'Closes a tool category index PDA and reclaims rent',
  deactivateTool: 'Sets tool is_active flag to false, hiding it from discovery',
  inscribeToolSchema: 'Inscribes tool JSON schema to transaction logs for permanent storage',
  publishTool: 'Publishes a new tool descriptor PDA with metadata and schema hashes',
  reactivateTool: 'Sets tool is_active flag back to true, restoring visibility',
  updateTool: 'Partially updates tool metadata; null values remain unchanged',
  reportToolInvocations: 'Updates tool stats with cumulative invocation count'
};

console.log('📝 Generazione commenti JSDoc professionali...\n');

files.forEach(file => {
  const filePath = path.join(instructionsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Pattern per trovare metodi con commenti semplici
  const simpleCommentPattern = /  \/\*\*\s*\n\s*\*\s+(\w+) \((\d+) accounts, (\d+) args\) \*\/\s*\n\s*async (\w+)\(/g;
  
  content = content.replace(simpleCommentPattern, (match, instructionName, accountCount, argCount, methodName) => {
    const description = methodDescriptions[methodName] || `${methodName.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;
    
    return `  /**
   * ${methodName.replace(/([A-Z])/g, ' $1').trim()}
   * @description ${description}.
   * @param {Object} ctx - Context object containing required accounts and parameters
   * @param {Signer} ctx.signer - Transaction signer
   * @param {Object[]} [ctx.remainingAccounts] - Optional remaining accounts
   * @returns {Promise<TransactionInstruction>} Transaction instruction
   */
  async ${methodName}(`;
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ ${file}`);
});

console.log('\n✨ Completato!');
