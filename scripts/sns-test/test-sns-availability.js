#!/usr/bin/env node

/**
 * Simple SNS Availability Test
 * 
 * Tests domain availability check on devnet.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

async function testSnsAvailability() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     SNS Domain Availability Test (Devnet)               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  const config = {
    rpcUrl: 'https://api.devnet.solana.com',
    walletPath: process.env.WALLET_PATH || join(homedir(), '.config/solana/id.json'),
  };
  
  // Load wallet
  console.log('🔑 Loading wallet...');
  const secretKeyString = readFileSync(config.walletPath, 'utf-8');
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const wallet = PublicKey.fromBytes(secretKey.slice(0, 32));
  console.log(`   Wallet: ${wallet.toBase58()}\n`);
  
  // Check balance
  const connection = new Connection(config.rpcUrl, 'confirmed');
  const balance = await connection.getBalance(wallet);
  console.log(`   Balance: ${balance / 1e9} SOL\n`);
  
  // Test domains
  const testDomains = [
    `test-agent-${Date.now()}`,
    'sap-test-agent',
    'synapse-agent-test',
  ];
  
  console.log('🔍 Checking domain availability:\n');
  
  for (const domainName of testDomains) {
    const fullDomain = `${domainName}.sol`;
    
    // Derive domain PDA (SNS program)
    const snsProgramId = new PublicKey('5ocQnJZyTetfyEqQ7VGzY5oXvV1xvMvJvHqJvHqJvHq');
    const [domainPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('domain'), Buffer.from(fullDomain)],
      snsProgramId
    );
    
    try {
      const accountInfo = await connection.getAccountInfo(domainPda);
      const isAvailable = !accountInfo;
      
      console.log(`   ${isAvailable ? '✓' : '✗'} ${fullDomain} - ${isAvailable ? 'AVAILABLE' : 'TAKEN'}`);
    } catch (error) {
      console.log(`   ? ${fullDomain} - Error checking`);
    }
  }
  
  console.log('\n✅ Test completed!');
  console.log('\nNote: Full SNS registration requires SNS SDK integration.');
  console.log('Current implementation provides stub for testing availability.');
}

testSnsAvailability().catch(console.error);
