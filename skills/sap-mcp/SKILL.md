---
name: sap-mcp
description: |
  MCP (Model Context Protocol) server integration for SAP SDK v0.3.0.
  Use when: building MCP servers for AI agents, exposing SAP tools via MCP,
  LLM integration with on-chain actions, AI agent tool servers.
triggers:
  - sap mcp
  - sap model context protocol
  - sap llm
  - sap ai server
  - sap tool server
---

# SAP SDK v0.3.0 — MCP Server Integration

> **Level:** Advanced/MCP  
> **Package:** `@oobe-protocol-labs/synapse-sap-sdk@0.3.0`  
> **MCP:** Model Context Protocol

---

## 1. MCP Server Setup

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SapClient } from '@oobe-protocol-labs/synapse-sap-sdk';

class SAPMCPServer {
  private server: Server;
  private sapClient: SapClient;
  
  constructor(sapClient: SapClient) {
    this.sapClient = sapClient;
    
    this.server = new Server(
      {
        name: 'synapse-sap-mcp',
        version: '0.3.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupToolHandlers();
  }
  
  private setupToolHandlers() {
    // List available SAP tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'register_agent',
            description: 'Register a new SAP agent',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                capabilities: { type: 'array', items: { type: 'string' } },
              },
              required: ['name'],
            },
          },
          {
            name: 'create_escrow',
            description: 'Create a new escrow for agent payments',
            inputSchema: {
              type: 'object',
              properties: {
                agentWallet: { type: 'string' },
                depositAmount: { type: 'number' },
                pricePerCall: { type: 'number' },
                maxCalls: { type: 'number' },
              },
              required: ['agentWallet', 'depositAmount'],
            },
          },
          {
            name: 'settle_escrow',
            description: 'Settle calls from an escrow (0.5% fee)',
            inputSchema: {
              type: 'object',
              properties: {
                depositor: { type: 'string' },
                nonce: { type: 'number' },
                calls: { type: 'number' },
              },
              required: ['depositor', 'nonce', 'calls'],
            },
          },
          {
            name: 'check_treasury',
            description: 'Check treasury balance and revenue',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });
    
    // Execute SAP tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'register_agent':
          return await this.registerAgent(args);
        
        case 'create_escrow':
          return await this.createEscrow(args);
        
        case 'settle_escrow':
          return await this.settleEscrow(args);
        
        case 'check_treasury':
          return await this.checkTreasury();
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }
  
  private async registerAgent(args: any) {
    const [agentPda] = Pdas.getAgentPDA(this.sapClient.wallet.publicKey);
    const [agentStats] = Pdas.getAgentStatsPDA(this.sapClient.wallet.publicKey);
    
    const ix = await this.sapClient.agent.registerAgent({
      signer: this.sapClient.wallet,
      wallet: this.sapClient.wallet.publicKey,
      agent: agentPda,
      agentStats,
      globalRegistry: Pdas.getGlobalPDA()[0],
      name: args.name,
      description: args.description || 'MCP Agent',
      capabilities: args.capabilities?.map((id: string) => ({
        id, description: null, protocolId: 'mcp', version: '1.0',
      })) || [],
      pricing: [],
      protocols: ['mcp'],
      agentId: null,
      agentUri: null,
      x402Endpoint: null,
    });
    
    const tx = await this.sapClient.buildTransaction(
      [ix],
      this.sapClient.wallet.publicKey
    );
    
    const sig = await this.sapClient.sendTransaction(tx, [this.sapClient.wallet]);
    
    return {
      content: [
        {
          type: 'text',
          text: `Agent registered successfully!\nSignature: ${sig}\nAgent PDA: ${agentPda.toBase58()}\nFee: 0.1 SOL (auto-collected to treasury)`,
        },
      ],
    };
  }
  
  private async settleEscrow(args: any) {
    const ix = await this.sapClient.escrowV2.settleCallsV2(
      new PublicKey(args.depositor),
      args.nonce,
      new BN(args.calls)
    );
    
    const tx = await this.sapClient.buildTransaction(
      [ix],
      this.sapClient.wallet.publicKey
    );
    
    const sig = await this.sapClient.sendTransaction(tx, [this.sapClient.wallet]);
    const fee = args.calls * 0.005; // 0.5% fee
    
    return {
      content: [
        {
          type: 'text',
          text: `Escrow settled successfully!\nSignature: ${sig}\nCalls settled: ${args.calls}\nFee collected: ${fee} SOL (0.5%)`,
        },
      ],
    };
  }
  
  private async checkTreasury() {
    const balance = await this.sapClient.connection.getBalance(TREASURY_WALLET);
    
    return {
      content: [
        {
          type: 'text',
          text: `Treasury Balance: ${(balance / 1e9).toFixed(4)} SOL\nTreasury Address: ${TREASURY_WALLET.toBase58()}`,
        },
      ],
    };
  }
  
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SAP MCP Server running on stdio');
  }
}

// Usage
const sapClient = new SapClient({ rpcUrl, wallet });
const mcpServer = new SAPMCPServer(sapClient);
mcpServer.start();
```

## 2. MCP Client Integration

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class SAPMCPClient {
  private client: Client;
  
  constructor() {
    this.client = new Client({
      name: 'sap-mcp-client',
      version: '0.3.0',
    });
  }
  
  async connect() {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['path/to/sap-mcp-server.js'],
    });
    
    await this.client.connect(transport);
    
    // List available tools
    const tools = await this.client.listTools();
    console.log('Available SAP tools:', tools.tools);
  }
  
  async registerAgent(name: string, description: string) {
    const result = await this.client.callTool({
      name: 'register_agent',
      arguments: { name, description },
    });
    
    return result.content[0].text;
  }
  
  async settleEscrow(depositor: string, nonce: number, calls: number) {
    const result = await this.client.callTool({
      name: 'settle_escrow',
      arguments: { depositor, nonce, calls },
    });
    
    return result.content[0].text;
  }
}

// Usage with LLM
const mcpClient = new SAPMCPClient();
await mcpClient.connect();

// LLM can now call SAP tools via MCP
const response = await mcpClient.registerAgent('My AI Agent', 'MCP-powered agent');
console.log(response);
```

---

**🤖 MCP server integration patterns for SAP!**
