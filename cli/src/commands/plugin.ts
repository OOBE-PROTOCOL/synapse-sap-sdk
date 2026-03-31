/**
 * @module cli/commands/plugin
 * @description Plugin management: list, install, create scaffold.
 */

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "../config";
import { buildContext } from "../context";
import { log, output } from "../logger";

// Known built-in plugin types
const BUILT_IN_PLUGINS = [
  {
    name: "SynapseAgentKit",
    type: "langchain",
    description: "52-tool LangChain-compatible toolkit for SAP",
    module: "@oobe-protocol-labs/synapse-sap-sdk/plugin",
  },
  {
    name: "VercelAI",
    type: "vercel-ai",
    description: "Vercel AI SDK adapter (planned)",
    module: "@oobe-protocol-labs/synapse-sap-sdk/plugin/vercel",
    status: "planned",
  },
  {
    name: "MCP",
    type: "mcp",
    description: "Model Context Protocol adapter (planned)",
    module: "@oobe-protocol-labs/synapse-sap-sdk/plugin/mcp",
    status: "planned",
  },
];

const SCAFFOLD_TEMPLATE = {
  "package.json": (name: string) =>
    JSON.stringify(
      {
        name: `synapse-sap-plugin-${name}`,
        version: "0.1.0",
        description: `Synapse SAP plugin: ${name}`,
        main: "dist/index.js",
        types: "dist/index.d.ts",
        scripts: {
          build: "tsc",
          dev: "tsc --watch",
        },
        peerDependencies: {
          "@oobe-protocol-labs/synapse-sap-sdk": "^0.6.0",
        },
        devDependencies: {
          typescript: "^5.7.0",
        },
      },
      null,
      2
    ),

  "tsconfig.json": () =>
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "commonjs",
          lib: ["ES2022"],
          outDir: "./dist",
          rootDir: "./src",
          strict: true,
          esModuleInterop: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          skipLibCheck: true,
        },
        include: ["src/**/*"],
      },
      null,
      2
    ),

  "src/index.ts": (name: string) =>
    `/**
 * Synapse SAP Plugin: ${name}
 *
 * This plugin extends the Synapse Agent Protocol with custom tools.
 */

import type { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";

export interface ${pascalCase(name)}PluginConfig {
  /** Plugin-specific configuration */
  readonly apiKey?: string;
}

export class ${pascalCase(name)}Plugin {
  private readonly client: SapClient;
  private readonly config: ${pascalCase(name)}PluginConfig;

  constructor(client: SapClient, config: ${pascalCase(name)}PluginConfig = {}) {
    this.client = client;
    this.config = config;
  }

  /**
   * Initialize the plugin.
   */
  async init(): Promise<void> {
    // Plugin initialization logic
    console.log("${pascalCase(name)}Plugin initialized");
  }

  /**
   * Get the list of tools provided by this plugin.
   */
  getTools(): Array<{ name: string; description: string }> {
    return [
      {
        name: "${name}_example_tool",
        description: "An example tool from the ${name} plugin",
      },
    ];
  }

  /**
   * Execute a tool by name.
   */
  async execute(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
      case "${name}_example_tool":
        return this.exampleTool(args);
      default:
        throw new Error(\`Unknown tool: \${toolName}\`);
    }
  }

  private async exampleTool(args: Record<string, unknown>): Promise<unknown> {
    // Implement your tool logic here
    return { result: "success", args };
  }
}

export default ${pascalCase(name)}Plugin;
`,

  "src/types.ts": (name: string) =>
    `/**
 * Types for the ${name} plugin.
 */

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
`,

  "README.md": (name: string) =>
    `# synapse-sap-plugin-${name}

A Synapse SAP plugin that extends the protocol with custom tools.

## Installation

\`\`\`bash
npm install synapse-sap-plugin-${name}
\`\`\`

## Usage

\`\`\`typescript
import { SapClient } from "@oobe-protocol-labs/synapse-sap-sdk";
import { ${pascalCase(name)}Plugin } from "synapse-sap-plugin-${name}";

const client = new SapClient(/* ... */);
const plugin = new ${pascalCase(name)}Plugin(client, {
  // config options
});

await plugin.init();
const tools = plugin.getTools();
\`\`\`

## Tools

| Name | Description |
|------|-------------|
| \`${name}_example_tool\` | An example tool |

## License

MIT
`,
};

function pascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function registerPluginCommands(program: Command): void {
  const plugin = program
    .command("plugin")
    .description("Plugin management & scaffolding")
    .addHelpText("after", `
Examples:
  $ synapse-sap plugin list
  $ synapse-sap plugin list --installed
  $ synapse-sap plugin install analytics
  $ synapse-sap plugin create my-plugin --template basic
  $ synapse-sap plugin validate ./synapse-sap-plugin-my-plugin

Plugin naming convention: synapse-sap-plugin-<name>
Plugins are discovered via npm and registered at runtime.
`);

  // ── plugin list ─────────────────────────────────
  plugin
    .command("list")
    .description("List available and installed plugins")
    .option("--installed", "Show only locally installed plugins")
    .action(async (opts) => {
      log.info("Built-in plugins:\n");
      output(
        BUILT_IN_PLUGINS.map((p) => ({
          name: p.name,
          type: p.type,
          description: p.description,
          status: p.status ?? "available",
        }))
      );

      // Check for locally installed plugins
      if (opts.installed) {
        log.info("\nScanning node_modules for SAP plugins...");
        try {
          const nmPath = path.join(process.cwd(), "node_modules");
          if (fs.existsSync(nmPath)) {
            const dirs = fs.readdirSync(nmPath);
            const sapPlugins = dirs.filter(
              (d) => d.startsWith("synapse-sap-plugin-") || d.startsWith("@synapse-sap/")
            );

            if (sapPlugins.length > 0) {
              output(sapPlugins.map((name) => ({ name, installed: true })));
            } else {
              log.info("No third-party SAP plugins found");
            }
          }
        } catch {
          log.warn("Could not scan node_modules");
        }
      }
    });

  // ── plugin install ──────────────────────────────
  plugin
    .command("install <name>")
    .description("Install a plugin from npm")
    .option("--dev", "Install as devDependency")
    .action(async (name: string, opts) => {
      const devFlag = opts.dev ? "--save-dev" : "--save";
      const packageName = name.startsWith("synapse-sap-plugin-") ? name : `synapse-sap-plugin-${name}`;

      log.info(`Installing ${packageName}...`);

      try {
        const { execSync } = await import("child_process");
        execSync(`npm install ${devFlag} ${packageName}`, { stdio: "inherit" });
        log.info(`Installed ${packageName}`);
      } catch (err) {
        log.error(`Failed to install ${packageName}`, { error: (err as Error).message });
        process.exit(1);
      }
    });

  // ── plugin create ───────────────────────────────
  plugin
    .command("create <name>")
    .description("Scaffold a new SAP plugin project")
    .option("--out <dir>", "Output directory")
    .option("--template <type>", "Template: basic | langchain | vercel-ai", "basic")
    .action(async (name: string, opts) => {
      const sanitized = name.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();
      const outDir = opts.out || `synapse-sap-plugin-${sanitized}`;

      if (fs.existsSync(outDir)) {
        log.error(`Directory already exists: ${outDir}`);
        process.exit(1);
      }

      log.info(`Scaffolding plugin "${sanitized}" at ${outDir}...`);

      // Create directories
      fs.mkdirSync(path.join(outDir, "src"), { recursive: true });

      // Write template files
      for (const [filename, generator] of Object.entries(SCAFFOLD_TEMPLATE)) {
        const content = typeof generator === "function" ? generator(sanitized) : generator;
        const filePath = path.join(outDir, filename);
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, content + "\n");
      }

      // Write .gitignore
      fs.writeFileSync(
        path.join(outDir, ".gitignore"),
        ["node_modules/", "dist/", ".env", "*.tsbuildinfo"].join("\n") + "\n"
      );

      log.info(`Plugin scaffolded at ${outDir}/`);
      log.info(`\nNext steps:`);
      log.info(`  cd ${outDir}`);
      log.info(`  npm install`);
      log.info(`  npm run build`);
    });

  // ── plugin validate ─────────────────────────────
  plugin
    .command("validate <dir>")
    .description("Validate a plugin project structure")
    .action(async (dir: string) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!fs.existsSync(dir)) {
        log.error(`Directory not found: ${dir}`);
        process.exit(1);
      }

      // Check required files
      const requiredFiles = ["package.json", "src/index.ts"];
      for (const f of requiredFiles) {
        if (!fs.existsSync(path.join(dir, f))) {
          errors.push(`Missing required file: ${f}`);
        }
      }

      // Check package.json
      const pkgPath = path.join(dir, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

          if (!pkg.name) errors.push("package.json: missing 'name'");
          if (!pkg.main) warnings.push("package.json: missing 'main' field");
          if (!pkg.types) warnings.push("package.json: missing 'types' field");

          if (!pkg.peerDependencies?.["@oobe-protocol-labs/synapse-sap-sdk"]) {
            warnings.push("package.json: SDK should be a peerDependency");
          }
        } catch {
          errors.push("package.json: invalid JSON");
        }
      }

      // Check tsconfig
      if (!fs.existsSync(path.join(dir, "tsconfig.json"))) {
        warnings.push("Missing tsconfig.json");
      }

      // Report
      if (errors.length > 0) {
        log.error(`Validation failed (${errors.length} error(s)):`);
        errors.forEach((e) => log.error(`  ✗ ${e}`));
      }
      if (warnings.length > 0) {
        log.warn(`${warnings.length} warning(s):`);
        warnings.forEach((w) => log.warn(`  ⚠ ${w}`));
      }
      if (errors.length === 0 && warnings.length === 0) {
        log.info("✓ Plugin structure is valid");
      }

      if (errors.length > 0) process.exit(1);
    });
}
