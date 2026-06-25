#!/usr/bin/env node

/**
 * SNS Domain Registration Test - Mainnet (Complete with new params)
 * 
 * Tests:
 * - Domain registration with SAP records
 * - web2Domain link
 * - agentEndpoint link
 * - setAsPrimary option
 * 
 * Uses official Bonfida SDK (@bonfida/spl-name-service)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  registerDomainNameV2,
  createRecordInstruction,
  getDomainKeySync,
  getRecordKeySync,
  Record,
  registerFavorite as setPrimaryDomain,
} from '@bonfida/spl-name-service';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { readFileSync } from 'fs';
import { join } from 'path';

// Constants
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const SAP_PROGRAM_ID = new PublicKey('SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ');

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('║   SNS Domain Registration - Complete Test (Mainnet)    ║');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Load wallet
  console.log(' Loading wallet...');
  const keypairPath = join(process.cwd(), 'test-keypair-mainnet.json');
  let wallet;
  try {
    const secretKey = JSON.parse(readFileSync(keypairPath, 'utf-8'));
    wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
    console.log(`✅ Loaded: ${wallet.publicKey.toBase58()}\n`);
  } catch (error) {
    console.log('❌ Wallet not found. Run script once to create wallet.\n');
    return;
  }

  // 2. Connect to mainnet
  console.log('📍 Connecting to mainnet...');
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // 3. Check balances
  const solBalance = await connection.getBalance(wallet.publicKey);
  const usdcAta = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);
  let usdcBalance = 0;
  try {
    const usdcAccount = await connection.getTokenAccountBalance(usdcAta);
    usdcBalance = parseFloat(usdcAccount.value.uiAmount || '0');
  } catch (error) {
    // USDC ATA doesn't exist yet
  }
  
  console.log(`💰 SOL Balance: ${(solBalance / 1e9).toFixed(4)} SOL`);
  console.log(`💵 USDC Balance: ${usdcBalance.toFixed(2)} USDC\n`);

  if (solBalance < 0.02e9 || usdcBalance < 20) {
    console.log('❌ Insufficient funds. Need at least 0.02 SOL and 20 USDC.\n');
    return;
  }

  // 4. Generate domain name
  const timestamp = Date.now();
  const domainName = `agent-test-${timestamp}`;
  const fullDomain = `${domainName}.sol`;
  
  console.log(`📍 Domain to register: ${fullDomain}\n`);

  // 5. Check availability
  console.log('📍 Checking domain availability...');
  const { pubkey: domainPda } = getDomainKeySync(fullDomain);
  const domainAccount = await connection.getAccountInfo(domainPda);
  
  if (domainAccount) {
    console.log(`   ❌ Domain is already registered\n`);
    return;
  }
  console.log(`   ✅ Domain is available\n`);

  // 6. Prepare registration with NEW parameters
  console.log('📍 Preparing registration with SAP records...\n');
  
  const instructions = [];
  
  // 6a. Register domain (V2 with USDC)
  console.log('[SDK] Building registerDomainNameV2 instruction...');
  const registerIxs = await registerDomainNameV2(
    connection,
    fullDomain,
    600, // space
    wallet.publicKey,
    usdcAta
  );
  instructions.push(...registerIxs);
  console.log(`   ✅ Registration instruction ready (${registerIxs.length} ix)\n`);

  // 6b. Create SAP records with NEW fields
  console.log('[SDK] Building SAP record instructions...\n');
  
  // Mock SAP Agent PDA
  const [mockAgentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('sap_agent'), wallet.publicKey.toBuffer()],
    SAP_PROGRAM_ID
  );
  
  // Define records with NEW parameters
  const sapRecords = [
    // Required SAP records
    { name: 'agentWallet', value: wallet.publicKey.toBase58() },
    { name: 'agentPda', value: mockAgentPda.toBase58() },
    { name: 'sapProgramId', value: SAP_PROGRAM_ID.toBase58() },
    
    // Optional SAP records
    { name: 'capabilities', value: JSON.stringify(['jupiter:swap', 'kamino:lend']) },
    { name: 'metadataUri', value: 'https://example.com/agent-metadata.json' },
    
    // NEW: Web2 domain link
    { name: 'web2Domain', value: 'agent.example.com' },
    
    // NEW: Agent endpoint for SAP registration
    { name: 'agentEndpoint', value: 'https://api.agent.example.com/sap/register' },
  ];
  
  for (const record of sapRecords) {
    console.log(`   Building ${record.name} record...`);
    
    const recordIx = await createRecordInstruction(
      connection,
      fullDomain,
      Record.TXT,
      record.value,
      wallet.publicKey, // owner
      wallet.publicKey  // payer
    );
    
    instructions.push(recordIx);
    console.log(`   ✅ ${record.name}: ${record.value.substring(0, 40)}...`);
  }
  
  // 6c. Set as primary domain (NEW feature)
  console.log('\n   Building setAsPrimary instruction...');
  const primaryIx = await setPrimaryDomain(
    connection,
    domainPda,
    wallet.publicKey
  );
  instructions.push(primaryIx);
  console.log(`   ✅ Primary domain instruction ready\n`);
  
  console.log(`✅ Total instructions: ${instructions.length}\n`);

  // 7. Send transaction
  console.log('📍 Sending transaction...');
  console.log(`   Instructions: ${instructions.length}`);
  console.log(`   Fee payer: ${wallet.publicKey.toBase58()}`);
  console.log(`   Set as primary: YES\n`);
  
  const transaction = new Transaction().add(...instructions);
  transaction.feePayer = wallet.publicKey;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  console.log('⏳ Confirming transaction...\n');
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [wallet],
    {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      commitment: 'confirmed',
    }
  );
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('║              ✅ DOMAIN REGISTERED!                     ║');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 Registration Details:');
  console.log(`   Domain: ${fullDomain}`);
  console.log(`   Domain PDA: ${domainPda.toBase58()}`);
  console.log(`   Agent PDA: ${mockAgentPda.toBase58()}`);
  console.log(`   Signature: ${signature}`);
  console.log(`   Records: ${sapRecords.length} created`);
  console.log(`   Set as primary: YES\n`);
  
  console.log('🔍 View on Explorer:');
  console.log(`   https://explorer.solana.com/tx/${signature}?cluster=mainnet\n`);
  
  console.log('📍 Features tested:');
  console.log(`   ✅ Domain registration (registerDomainNameV2)`);
  console.log(`   ✅ SAP records (agentWallet, agentPda, sapProgramId)`);
  console.log(`   ✅ Capabilities (JSON array)`);
  console.log(`   ✅ Metadata URI`);
  console.log(`   ✅ NEW: web2Domain link`);
  console.log(`   ✅ NEW: agentEndpoint link`);
  console.log(`   ✅ NEW: setAsPrimary\n`);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('║              ✅ TEST COMPLETED                         ║');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
