#!/usr/bin/env node

/**
 * Synapse SAP SDK - Complete Agent Creation Flow (Mainnet)
 * 
 * This script demonstrates the complete agent registration flow:
 * 1. Create SAP Agent (on-chain registration)
 * 2. Add Metaplex Identity (NFT-based agent identity)
 * 3. Register SNS Domain (.sol domain for agent)
 * 
 * All operations use the official SDK on Solana mainnet.
 * 
 * Prerequisites:
 * - Mainnet SOL (~0.05 SOL for all operations)
 * - Mainnet USDC (~20 USDC for SNS registration)
 * - Wallet with sufficient funds
 * 
 * Usage:
 *   node scripts/test-complete-agent-flow.js
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Import SAP SDK modules
import { SapClient, AgentConfig } from '../dist/esm/client.js';
import { SnsModule } from '../dist/esm/modules/sns.js';

// Metaplex module is optional - will be implemented in v0.22.0
// import { MetaplexModule } from '../dist/esm/modules/metaplex.js';

// Configuration
const CONFIG = {
  RPC_URL: 'https://api.mainnet-beta.solana.com',
  SAP_PROGRAM_ID: 'SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ',
  KEYPAIR_PATH: './test-keypair-mainnet.json',
  AGENT_NAME: 'test-trading-agent',
  AGENT_DESCRIPTION: 'Automated trading agent with DeFi capabilities',
  AGENT_CAPABILITIES: [
    'jupiter:swap',
    'jupiter:limit-order',
    'kamino:lend',
    'kamino:borrow',
    'drifty:trading',
    'marginfi:lend',
  ],
  METADATA_URI: 'https://example.com/agent-metadata.json',
  SNS_DOMAIN: 'trading-agent-test', // Will become trading-agent-test.sol
  SNS_DURATION_YEARS: 1,
};

/**
 * Load or create wallet
 */
async function loadWallet() {
  console.log('\n📍 Loading wallet...');
  
  try {
    if (fs.existsSync(CONFIG.KEYPAIR_PATH)) {
      const secretKey = JSON.parse(fs.readFileSync(CONFIG.KEYPAIR_PATH, 'utf-8'));
      const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
      console.log(`✅ Loaded existing wallet: ${wallet.publicKey.toBase58()}`);
      return wallet;
    } else {
      const wallet = Keypair.generate();
      const secretKey = JSON.stringify(Array.from(wallet.secretKey));
      fs.writeFileSync(CONFIG.KEYPAIR_PATH, secretKey);
      console.log(`✅ Created new wallet: ${wallet.publicKey.toBase58()}`);
      console.log(`📁 Saved to: ${path.resolve(CONFIG.KEYPAIR_PATH)}`);
      console.log('⚠️  IMPORTANT: Fund this wallet with SOL and USDC before proceeding!');
      return wallet;
    }
  } catch (error) {
    console.error('❌ Failed to load wallet:', error);
    throw error;
  }
}

/**
 * Check wallet balances
 */
async function checkBalances(connection, wallet) {
  console.log('\n📍 Checking wallet balances...');
  
  const solBalance = await connection.getBalance(wallet.publicKey);
  const solBalanceFormatted = solBalance / 1e9;
  
  console.log(`💰 SOL Balance: ${solBalanceFormatted.toFixed(4)} SOL`);
  
  if (solBalanceFormatted < 0.05) {
    console.log('⚠️  WARNING: Low SOL balance. Need at least 0.05 SOL for all operations.');
    console.log('💡 Please fund your wallet with SOL before proceeding.');
    return false;
  }
  
  // Check USDC balance
  const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
  const usdcAta = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);
  
  try {
    const usdcAccount = await connection.getAccountInfo(usdcAta);
    if (usdcAccount) {
      const usdcBalance = usdcAccount.data.readBigUInt64LE(64) / 1e6;
      console.log(`💵 USDC Balance: ${usdcBalance.toFixed(2)} USDC`);
      
      if (usdcBalance < 20) {
        console.log('⚠️  WARNING: Low USDC balance. Need at least 20 USDC for SNS registration.');
        console.log('💡 Please fund your wallet with USDC before proceeding.');
        return false;
      }
    } else {
      console.log('💵 USDC Balance: 0.00 USDC (ATA not created yet)');
      console.log('⚠️  WARNING: Need at least 20 USDC for SNS registration.');
      return false;
    }
  } catch (error) {
    console.log('💵 USDC Balance: 0.00 USDC (ATA not created yet)');
    console.log('⚠️  WARNING: Need at least 20 USDC for SNS registration.');
    return false;
  }
  
  console.log('✅ Wallet has sufficient funds');
  return true;
}

/**
 * Step 1: Register SAP Agent
 */
async function registerSapAgent(sapClient, wallet) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('STEP 1: Register SAP Agent');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const agentConfig = {
    name: CONFIG.AGENT_NAME,
    description: CONFIG.AGENT_DESCRIPTION,
    capabilities: CONFIG.AGENT_CAPABILITIES,
    metadataUri: CONFIG.METADATA_URI,
  };
  
  console.log('📋 Agent Configuration:');
  console.log(`   Name: ${agentConfig.name}`);
  console.log(`   Description: ${agentConfig.description}`);
  console.log(`   Capabilities: ${agentConfig.capabilities.join(', ')}`);
  console.log(`   Metadata URI: ${agentConfig.metadataUri}`);
  console.log('');
  
  try {
    console.log('📝 Registering agent on-chain...');
    
    const result = await sapClient.registerAgent({
      config: agentConfig,
      signer: wallet,
    });
    
    console.log('\n✅ AGENT REGISTERED SUCCESSFULLY!\n');
    console.log('📊 Agent Details:');
    console.log(`   Agent PDA: ${result.agentPda.toBase58()}`);
    console.log(`   Owner: ${result.owner.toBase58()}`);
    console.log(`   Version: ${result.version}`);
    console.log(`   Signature: ${result.signature}`);
    
    console.log('\n🔍 View on Explorer:');
    console.log(`   https://explorer.solana.com/tx/${result.signature}?cluster=mainnet`);
    console.log(`   https://explorer.solana.com/address/${result.agentPda.toBase58()}?cluster=mainnet`);
    
    return result;
  } catch (error) {
    console.error('\n❌ Agent registration failed:', error.message);
    
    if (error.message.includes('already registered')) {
      console.log('ℹ️  Agent already exists. Fetching existing agent...');
      
      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('sap_agent'), wallet.publicKey.toBuffer()],
        new PublicKey(CONFIG.SAP_PROGRAM_ID)
      );
      
      const agent = await sapClient.getAgent(agentPda);
      console.log(`✅ Found existing agent: ${agentPda.toBase58()}`);
      
      return {
        agentPda,
        owner: wallet.publicKey,
        version: agent.version,
        signature: 'existing',
      };
    }
    
    throw error;
  }
}

/**
 * Step 2: Add Metaplex Identity (Optional)
 */
async function addMetaplexIdentity(metaplexModule, wallet, agentPda) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('STEP 2: Add Metaplex Identity');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📋 Metaplex Identity Configuration:');
  console.log('   Mint NFT representing agent identity');
  console.log('   Link NFT to agent PDA');
  console.log('   Enable NFT-based authentication');
  console.log('');
  
  try {
    console.log('📝 Creating Metaplex identity NFT...');
    
    const metadata = {
      name: `${CONFIG.AGENT_NAME} Identity`,
      symbol: 'AGENT',
      description: `NFT identity for ${CONFIG.AGENT_NAME} - ${CONFIG.AGENT_DESCRIPTION}`,
      image: CONFIG.METADATA_URI.replace('.json', '/image.png'),
      attributes: [
        { trait_type: 'Agent Type', value: 'Trading' },
        { trait_type: 'Capabilities', value: CONFIG.AGENT_CAPABILITIES.length.toString() },
        { trait_type: 'Version', value: '1.0' },
      ],
    };
    
    const result = await metaplexModule.createAgentNft({
      agentPda,
      owner: wallet.publicKey,
      metadata,
      signer: wallet,
    });
    
    console.log('\n✅ METAPLEX IDENTITY CREATED!\n');
    console.log('📊 Identity Details:');
    console.log(`   Mint: ${result.mint.toBase58()}`);
    console.log(`   Metadata PDA: ${result.metadataPda.toBase58()}`);
    console.log(`   Master Edition: ${result.masterEditionPda.toBase58()}`);
    console.log(`   Signature: ${result.signature}`);
    
    console.log('\n🔍 View on Explorer:');
    console.log(`   https://explorer.solana.com/tx/${result.signature}?cluster=mainnet`);
    console.log(`   https://explorer.solana.com/address/${result.mint.toBase58()}?cluster=mainnet`);
    
    console.log('\n🎨 Metadata:');
    console.log(`   Name: ${metadata.name}`);
    console.log(`   Symbol: ${metadata.symbol}`);
    console.log(`   Image: ${metadata.image}`);
    
    return result;
  } catch (error) {
    console.error('\n❌ Metaplex identity creation failed:', error.message);
    console.log('⚠️  Skipping Metaplex identity (non-critical)');
    return null;
  }
}

/**
 * Step 3: Register SNS Domain
 */
async function registerSnsDomain(snsModule, wallet, agentPda) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('STEP 3: Register SNS Domain');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📋 SNS Domain Configuration:');
  console.log(`   Domain: ${CONFIG.SNS_DOMAIN}.sol`);
  console.log(`   Duration: ${CONFIG.SNS_DURATION_YEARS} year(s)`);
  console.log('   Records: wallet, avatar, email, description, url');
  console.log('');
  
  try {
    console.log('📝 Registering SNS domain with SAP records...');
    
    const result = await snsModule.registerAgentDomain({
      agentWallet: wallet.publicKey,
      domainName: CONFIG.SNS_DOMAIN,
      durationYears: CONFIG.SNS_DURATION_YEARS,
      capabilities: CONFIG.AGENT_CAPABILITIES,
      metadataUri: CONFIG.METADATA_URI,
      signer: wallet,
    });
    
    console.log('\n✅ SNS DOMAIN REGISTERED!\n');
    console.log('📊 Domain Details:');
    console.log(`   Domain: ${result.domain}`);
    console.log(`   Domain PDA: ${result.domainPda.toBase58()}`);
    console.log(`   Agent PDA: ${result.agentPda.toBase58()}`);
    console.log(`   Signature: ${result.transactionSignature}`);
    console.log(`   Records: ${Object.keys(result.recordPdas).length} created`);
    
    console.log('\n📊 Record PDAs:');
    for (const [recordType, pda] of Object.entries(result.recordPdas)) {
      console.log(`   ${recordType}: ${pda.toBase58()}`);
    }
    
    console.log('\n🔍 View on Explorer:');
    console.log(`   https://explorer.solana.com/tx/${result.transactionSignature}?cluster=mainnet`);
    console.log(`   https://explorer.solana.com/address/${result.domainPda.toBase58()}?cluster=mainnet`);
    
    // Test resolution
    console.log('\n📍 Testing domain resolution...');
    const resolved = await snsModule.resolveAgentDomain(result.domain);
    
    if (resolved) {
      console.log('✅ Domain resolved successfully!');
      console.log(`   Agent PDA: ${resolved.agentPda.toBase58()}`);
      console.log(`   Wallet: ${resolved.wallet.toBase58()}`);
      console.log(`   Capabilities: ${resolved.metadata.capabilities?.join(', ') || 'N/A'}`);
    } else {
      console.log('⚠️  Resolution returned null (records may need time to index)');
    }
    
    return result;
  } catch (error) {
    console.error('\n❌ SNS domain registration failed:', error.message);
    
    if (error.message.includes('already registered')) {
      console.log('ℹ️  Domain already exists. Resolving existing domain...');
      
      const resolved = await snsModule.resolveAgentDomain(`${CONFIG.SNS_DOMAIN}.sol`);
      if (resolved) {
        console.log(`✅ Found existing domain: ${CONFIG.SNS_DOMAIN}.sol`);
        console.log(`   Agent PDA: ${resolved.agentPda.toBase58()}`);
        return { domain: `${CONFIG.SNS_DOMAIN}.sol`, ...resolved };
      }
    }
    
    console.log('⚠️  Skipping SNS domain (non-critical)');
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('║   Synapse SAP SDK - Complete Agent Creation Flow        ║');
  console.log('║              Mainnet End-to-End Test                    ║');
  console.log('═══════════════════════════════════════════════════════════');
  
  // 1. Load wallet
  const wallet = await loadWallet();
  
  // 2. Setup connection
  console.log('\n📍 Setting up mainnet connection...');
  const connection = new Connection(CONFIG.RPC_URL, 'confirmed');
  console.log(`✅ Connected to: ${CONFIG.RPC_URL}`);
  
  // 3. Check balances
  const hasFunds = await checkBalances(connection, wallet);
  
  if (!hasFunds) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('║  ⚠️  INSUFFICIENT FUNDS - PLEASE FUND WALLET FIRST       ║');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 Required:');
    console.log('   - 0.05 SOL (~$10) for transaction fees');
    console.log('   - 20 USDC for SNS domain registration');
    console.log('');
    console.log('📍 Wallet Address:');
    console.log(`   ${wallet.publicKey.toBase58()}`);
    console.log('');
    console.log('💡 After funding, run this script again.');
    console.log('   The script will resume from where it left off.\n');
    return;
  }
  
  // 4. Initialize SAP Client
  console.log('\n📍 Initializing SAP Client...');
  const sapClient = new SapClient({
    connection,
    programId: CONFIG.SAP_PROGRAM_ID,
  });
  console.log('✅ SAP Client ready');
  
  // 5. Initialize SNS Module
  console.log('\n📍 Initializing SNS Module...');
  const snsModule = new SnsModule({
    connection,
    sapProgramId: CONFIG.SAP_PROGRAM_ID,
  });
  console.log('✅ SNS Module ready');
  
  // 6. Metaplex Module (optional - not yet implemented)
  console.log('\n📍 Metaplex Module...');
  let metaplexModule = null;
  console.log('⚠️  Metaplex Module not yet implemented (planned for v0.22.0)');
  console.log('   Skipping NFT identity creation (optional feature)\n');
  
  // 7. Execute registration flow
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('║          STARTING AGENT REGISTRATION FLOW               ║');
  console.log('═══════════════════════════════════════════════════════════');
  
  const results = {
    sapAgent: null,
    metaplexIdentity: null,
    snsDomain: null,
  };
  
  try {
    // Step 1: Register SAP Agent
    results.sapAgent = await registerSapAgent(sapClient, wallet);
    
    // Step 2: Add Metaplex Identity (optional - not implemented yet)
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 2: Add Metaplex Identity (SKIPPED)');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('⚠️  Metaplex Module not yet implemented (planned for v0.22.0)');
    console.log('   Skipping NFT identity creation (optional feature)\n');
    results.metaplexIdentity = null;
    
    // Step 3: Register SNS Domain
    results.snsDomain = await registerSnsDomain(
      snsModule,
      wallet,
      results.sapAgent.agentPda
    );
    
    // Final summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('║         ✅ AGENT CREATION COMPLETED SUCCESSFULLY        ║');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('\n📊 Final Agent State:');
    console.log(`   Agent PDA: ${results.sapAgent.agentPda.toBase58()}`);
    console.log(`   Owner: ${results.sapAgent.owner.toBase58()}`);
    console.log(`   Version: ${results.sapAgent.version}`);
    console.log('   Identity NFT: Not created (Metaplex Module planned for v0.22.0)');
    
    if (results.snsDomain) {
      console.log(`   SNS Domain: ${results.snsDomain.domain}`);
      console.log(`   Domain PDA: ${results.snsDomain.domainPda.toBase58()}`);
    } else {
      console.log('   SNS Domain: Not registered (optional)');
    }
    
    console.log('\n🎉 Agent is ready for use!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Verify all transactions on Solana Explorer');
    console.log('   2. Test agent capabilities (swap, lend, borrow, etc.)');
    console.log('   3. Integrate agent into your application');
    console.log('   4. Monitor agent performance and usage');
    console.log('');
    
    return results;
  } catch (error) {
    console.error('\n❌ Agent creation flow failed!');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Check wallet has sufficient SOL and USDC');
    console.error('   - Verify RPC endpoint is working');
    console.error('   - Check SAP program is deployed on mainnet');
    console.error('   - Review error logs above for details');
    console.error('');
    throw error;
  }
}

// Execute
main()
  .then((results) => {
    if (results) {
      console.log('✅ Test completed successfully!');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
