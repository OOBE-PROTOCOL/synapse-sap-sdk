#!/usr/bin/env node

/**
 * ON-CHAIN IDL AUDIT TOOL
 * Fetches actual IDL from deployed programs on mainnet and devnet
 * Compares with local SDK IDLs to find mismatches
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const PROGRAM_ID = 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ';

// RPC endpoints
const RPC_ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com'
};

console.log('='.repeat(80));
console.log('ON-CHAIN IDL AUDIT - SAP PROGRAM');
console.log('='.repeat(80));
console.log(`Program ID: ${PROGRAM_ID}`);
console.log();

async function fetchProgramIDL(network) {
  console.log(`Fetching IDL from ${network}...`);
  console.log('-'.repeat(80));
  
  const rpc = RPC_ENDPOINTS[network];
  const connection = new Connection(rpc, 'confirmed');
  
  try {
    // Get program data
    const programId = new PublicKey(PROGRAM_ID);
    const programAccount = await connection.getAccountInfo(programId);
    
    if (!programAccount) {
      console.log(`   ❌ Program not found on ${network}`);
      return null;
    }
    
    console.log(`   ✓ Program found on ${network}`);
    console.log(`     Owner: ${programAccount.owner.toString()}`);
    console.log(`     Size: ${programAccount.data.length} bytes`);
    console.log(`     Executable: ${programAccount.executable}`);
    console.log();
    
    // Fetch IDL from IDL account (Anchor stores IDL in separate account)
    // IDL account address is derived from program ID
    const idlAddress = await findIdlAddress(programId);
    
    try {
      const idlAccount = await connection.getAccountInfo(idlAddress);
      if (idlAccount && idlAccount.data.length > 0) {
        // Parse IDL data (Anchor IDL format)
        const idlData = idlAccount.data.slice(8); // Skip first 8 bytes (discriminator)
        const idlString = idlData.toString('utf8').replace(/\0/g, '');
        const idl = JSON.parse(idlString);
        
        console.log(`   ✓ IDL account found: ${idlAddress.toString()}`);
        console.log(`     IDL Version: ${idl.version || idl.metadata?.version || 'unknown'}`);
        console.log(`     Instructions: ${idl.instructions?.length || 0}`);
        console.log();
        
        return idl;
      }
    } catch (err) {
      console.log(`   ⚠️  Could not fetch IDL account: ${err.message}`);
    }
    
    // Alternative: Try to get IDL from program buffer
    console.log(`   ⚠️  IDL account not found, trying program buffer...`);
    
    return null;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function findIdlAddress(programId) {
  // Anchor IDL address derivation
  const [idlAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('anchor:idl'), programId.toBuffer()],
    programId
  );
  return idlAddress;
}

function analyzeRegisterAgent(idl, source) {
  console.log(`register_agent analysis (${source}):`);
  console.log('-'.repeat(80));
  
  if (!idl || !idl.instructions) {
    console.log('   ❌ No instructions available');
    console.log();
    return null;
  }
  
  const registerAgent = idl.instructions.find(i => i.name === 'register_agent');
  
  if (!registerAgent) {
    console.log('   ❌ register_agent instruction NOT FOUND');
    console.log();
    return null;
  }
  
  console.log(`   ✓ register_agent found`);
  console.log(`     Accounts: ${registerAgent.accounts?.length || 0}`);
  
  if (registerAgent.accounts) {
    registerAgent.accounts.forEach((acc, i) => {
      const flags = [];
      if (acc.signer) flags.push('signer');
      if (acc.writable) flags.push('writable');
      if (acc.pda) flags.push('PDA');
      console.log(`     ${i + 1}. ${acc.name.padEnd(25)} [${flags.join(', ') || 'none'}]`);
    });
  }
  
  const hasPricingMenu = registerAgent.accounts?.some(a => a.name === 'pricing_menu');
  console.log();
  console.log(`     pricing_menu present: ${hasPricingMenu ? '✅ YES' : '❌ NO'}`);
  console.log();
  
  return {
    accountCount: registerAgent.accounts?.length || 0,
    hasPricingMenu,
    accounts: registerAgent.accounts?.map(a => a.name) || []
  };
}

function analyzeCloseAgent(idl, source) {
  console.log(`close_agent analysis (${source}):`);
  console.log('-'.repeat(80));
  
  if (!idl || !idl.instructions) {
    console.log('   ❌ No instructions available');
    console.log();
    return null;
  }
  
  const closeAgent = idl.instructions.find(i => i.name === 'close_agent');
  
  if (!closeAgent) {
    console.log('   ❌ close_agent instruction NOT FOUND');
    console.log();
    return null;
  }
  
  console.log(`   ✓ close_agent found`);
  console.log(`     Accounts: ${closeAgent.accounts?.length || 0}`);
  
  if (closeAgent.accounts) {
    closeAgent.accounts.forEach((acc, i) => {
      const flags = [];
      if (acc.signer) flags.push('signer');
      if (acc.writable) flags.push('writable');
      if (acc.pda) flags.push('PDA');
      console.log(`     ${i + 1}. ${acc.name.padEnd(25)} [${flags.join(', ') || 'none'}]`);
    });
  }
  
  const hasPricingMenu = closeAgent.accounts?.some(a => a.name === 'pricing_menu');
  console.log();
  console.log(`     pricing_menu present: ${hasPricingMenu ? '✅ YES' : '❌ NO'}`);
  console.log();
  
  return {
    accountCount: closeAgent.accounts?.length || 0,
    hasPricingMenu,
    accounts: closeAgent.accounts?.map(a => a.name) || []
  };
}

async function main() {
  // Fetch from mainnet
  const mainnetIDL = await fetchProgramIDL('mainnet');
  
  // Fetch from devnet
  const devnetIDL = await fetchProgramIDL('devnet');
  
  // Analyze
  console.log('='.repeat(80));
  console.log('INSTRUCTION ANALYSIS');
  console.log('='.repeat(80));
  console.log();
  
  const mainnetRegister = analyzeRegisterAgent(mainnetIDL, 'mainnet');
  const devnetRegister = analyzeRegisterAgent(devnetIDL, 'devnet');
  
  const mainnetClose = analyzeCloseAgent(mainnetIDL, 'mainnet');
  const devnetClose = analyzeCloseAgent(devnetIDL, 'devnet');
  
  // Compare
  console.log('='.repeat(80));
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(80));
  console.log();
  
  console.log('register_agent:');
  console.log(`   mainnet: ${mainnetRegister?.accountCount || '?'} accounts, pricing_menu: ${mainnetRegister?.hasPricingMenu ? 'YES' : 'NO'}`);
  console.log(`   devnet:  ${devnetRegister?.accountCount || '?'} accounts, pricing_menu: ${devnetRegister?.hasPricingMenu ? 'YES' : 'NO'}`);
  console.log();
  
  console.log('close_agent:');
  console.log(`   mainnet: ${mainnetClose?.accountCount || '?'} accounts, pricing_menu: ${mainnetClose?.hasPricingMenu ? 'YES' : 'NO'}`);
  console.log(`   devnet:  ${devnetClose?.accountCount || '?'} accounts, pricing_menu: ${devnetClose?.hasPricingMenu ? 'YES' : 'NO'}`);
  console.log();
  
  // Compare with local IDLs
  console.log('='.repeat(80));
  console.log('LOCAL SDK COMPARISON');
  console.log('='.repeat(80));
  console.log();
  
  const localIDLs = [
    {
      path: '/Users/keepeeto/Desktop/synapse-agent-sap/synapse-sap-sdk/idl/synapse_agent_sap.json',
      name: 'synapse-agent-sap (v0.17.1)'
    },
    {
      path: '/Users/keepeeto/Desktop/synapse-sap-sdk/idl/synapse_agent_sap.json',
      name: 'synapse-sap-sdk (v0.25.0)'
    }
  ];
  
  for (const local of localIDLs) {
    try {
      const content = fs.readFileSync(local.path, 'utf8');
      const localIDL = JSON.parse(content);
      
      console.log(`${local.name}:`);
      console.log('-'.repeat(80));
      
      const localRegister = analyzeRegisterAgent(localIDL, local.name);
      const localClose = analyzeCloseAgent(localIDL, local.name);
      
      console.log(`   register_agent: ${localRegister?.accountCount || '?'} accounts, pricing_menu: ${localRegister?.hasPricingMenu ? 'YES' : 'NO'}`);
      console.log(`   close_agent: ${localClose?.accountCount || '?'} accounts, pricing_menu: ${localClose?.hasPricingMenu ? 'YES' : 'NO'}`);
      console.log();
      
      // Compare with mainnet
      if (mainnetRegister && localRegister) {
        const match = mainnetRegister.accountCount === localRegister.accountCount &&
                      mainnetRegister.hasPricingMenu === localRegister.hasPricingMenu;
        console.log(`   vs mainnet: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
      }
      console.log();
      
    } catch (error) {
      console.log(`${local.name}: ❌ Error reading - ${error.message}`);
      console.log();
    }
  }
  
  console.log('='.repeat(80));
  console.log('FINAL VERDICT');
  console.log('='.repeat(80));
  console.log();
  
  if (mainnetRegister && devnetRegister) {
    const networksMatch = mainnetRegister.accountCount === devnetRegister.accountCount &&
                          mainnetRegister.hasPricingMenu === devnetRegister.hasPricingMenu;
    
    if (networksMatch) {
      console.log(`✅ mainnet and devnet programs are IDENTICAL`);
      console.log(`   register_agent: ${mainnetRegister.accountCount} accounts`);
      console.log(`   pricing_menu: ${mainnetRegister.hasPricingMenu ? 'PRESENT' : 'ABSENT'}`);
    } else {
      console.log(`❌ mainnet and devnet programs DIFFER`);
      console.log(`   mainnet: ${mainnetRegister.accountCount} accounts, pricing_menu: ${mainnetRegister.hasPricingMenu ? 'YES' : 'NO'}`);
      console.log(`   devnet:  ${devnetRegister.accountCount} accounts, pricing_menu: ${devnetRegister.hasPricingMenu ? 'YES' : 'NO'}`);
    }
  } else {
    console.log('⚠️  Could not fetch on-chain IDLs');
    console.log('   This may mean:');
    console.log('   1. Program not deployed to that network');
    console.log('   2. IDL account not initialized');
    console.log('   3. Network RPC issues');
    console.log();
    console.log('   Alternative: Check Solana Explorer for program details');
  }
  
  console.log();
  console.log('='.repeat(80));
}

main().catch(console.error);
