/**
 * @module cli/ui
 * @description Professional UI components — ASCII banners, animations, menus
 * @since v1.0.0
 */

import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';

// ═══════════════════════════════════════════════════════════════════
//  ASCII Banner
// ═══════════════════════════════════════════════════════════════════

export const ASCII_BANNER = `
${chalk.cyan.bold(`
 ███████╗██╗  ██╗██╗   ██╗ ██████╗ ███████╗██████╗ ██╗   ██╗
 ╚══███╔╝██║  ██║██║   ██║██╔═══██╗██╔════╝██╔══██╗╚██╗ ██╔╝
  ███╔╝ ███████║██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝ 
 ███╔╝  ╚════██║██║   ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝  
███████╗     ██║╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║   
╚══════╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   
                                                           
 ███████╗██╗   ██╗███████╗████████╗███████╗███╗   ███╗
 ██╔════╝╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝████╗ ████║
 ███████╗ ╚████╔╝ ███████╗   ██║   █████╗  ██╔████╔██║
 ╚════██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║
 ███████║   ██║   ███████║   ██║   ███████╗██║ ╚═╝ ██║
 ╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝
`)}
${chalk.gray('─'.repeat(60))}
${chalk.yellow.bold('v1.0.0 Commerce Edition')} ${chalk.gray('|')} ${chalk.green.bold('MAINNET READY')}
${chalk.gray('─'.repeat(60))}
${chalk.dim('Treasury:')} ${chalk.cyan('J7PyZAGKvprCz4SQ5DKBLAHstJxgVqZcz6kguUoWpP7P')}
${chalk.dim('Program:')} ${chalk.cyan('SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ')}
`;

// ═══════════════════════════════════════════════════════════════════
//  Animated Spinner
// ═══════════════════════════════════════════════════════════════════

export interface SpinnerOptions {
  text: string;
  color?: 'cyan' | 'green' | 'yellow' | 'red';
  spinner?: 'dots' | 'line' | 'simpleDots' | 'star' | 'moon';
}

export function createSpinner(options: SpinnerOptions) {
  const spinnerMap = {
    dots: 'dots',
    line: 'line',
    simpleDots: 'simpleDots',
    star: 'star',
    moon: 'moon',
  };
  
  const colorMap = {
    cyan: 'cyan',
    green: 'green',
    yellow: 'yellow',
    red: 'red',
  };
  
  const spinner = ora({
    text: chalk[options.color || 'cyan'](options.text),
    spinner: options.spinner || 'dots',
    color: options.color || 'cyan',
  });
  
  return spinner;
}

// ═══════════════════════════════════════════════════════════════════
//  Progress Bar
// ═══════════════════════════════════════════════════════════════════

export interface ProgressBarOptions {
  total: number;
  text: string;
  color?: 'cyan' | 'green' | 'yellow';
}

export function createProgressBar(options: ProgressBarOptions) {
  let current = 0;
  const barLength = 30;
  
  return {
    update: (increment: number = 1) => {
      current = Math.min(current + increment, options.total);
      const progress = current / options.total;
      const filled = Math.round(barLength * progress);
      const empty = barLength - filled;
      
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      const percentage = (progress * 100).toFixed(1);
      
      process.stdout.write(`\r${chalk[options.color || 'cyan'](options.text)} [${bar}] ${percentage}% (${current}/${options.total})`);
      
      if (current >= options.total) {
        process.stdout.write('\n');
      }
    },
    
    complete: () => {
      current = options.total;
      const bar = '█'.repeat(barLength);
      process.stdout.write(`\r${chalk.green(options.text)} [${bar}] 100% (${current}/${options.total})\n`);
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Interactive Menu
// ═══════════════════════════════════════════════════════════════════

export interface MenuItem {
  label: string;
  value: string;
  description?: string;
  icon?: string;
}

export interface MenuOptions {
  title: string;
  items: MenuItem[];
  default?: number;
}

export async function showMenu(options: MenuOptions): Promise<string> {
  const { title, items, default: defaultIndex = 0 } = options;
  
  console.log(`\n${chalk.cyan.bold(title)}`);
  console.log(chalk.gray('─'.repeat(50)));
  
  items.forEach((item, index) => {
    const isSelected = index === defaultIndex;
    const icon = item.icon || '  ';
    const label = isSelected ? chalk.green.bold(`❯ ${item.label}`) : chalk.white(`  ${item.label}`);
    const desc = item.description ? chalk.gray(` — ${item.description}`) : '';
    
    console.log(`${icon} ${label}${desc}`);
  });
  
  console.log(chalk.gray('─'.repeat(50)));
  
  // Simple menu selection (for now — can be enhanced with inquirer)
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    readline.question(chalk.yellow('\nSelect option (0-${items.length - 1}): '), (answer: string) => {
      const index = parseInt(answer);
      if (index >= 0 && index < items.length) {
        resolve(items[index].value);
      } else {
        resolve(items[defaultIndex].value);
      }
      readline.close();
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Status Messages
// ═══════════════════════════════════════════════════════════════════

export const status = {
  success: (message: string) => {
    console.log(`\n${chalk.green('✅')} ${chalk.bold(message)}`);
  },
  
  error: (message: string) => {
    console.log(`\n${chalk.red('❌')} ${chalk.bold(message)}`);
  },
  
  warning: (message: string) => {
    console.log(`\n${chalk.yellow('⚠️')} ${chalk.bold(message)}`);
  },
  
  info: (message: string) => {
    console.log(`\n${chalk.blue('ℹ️')} ${chalk.bold(message)}`);
  },
  
  tip: (message: string) => {
    console.log(`\n${chalk.dim('💡')} ${chalk.gray(message)}`);
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Fee Display
// ═══════════════════════════════════════════════════════════════════

export interface FeeInfo {
  type: string;
  amount: string;
  description: string;
}

export function displayFees(fees: FeeInfo[]) {
  console.log(`\n${chalk.cyan.bold('💰 Revenue Fees')}`);
  console.log(chalk.gray('─'.repeat(50)));
  
  fees.forEach((fee) => {
    console.log(
      chalk.white(`  ${fee.type.padEnd(20)}`) +
      chalk.yellow(` ${fee.amount.padEnd(15)}`) +
      chalk.gray(` — ${fee.description}`)
    );
  });
  
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`${chalk.dim('Treasury:')} ${chalk.cyan('J7PyZAGKvprCz4SQ5DKBLAHstJxgVqZcz6kguUoWpP7P')}\n`);
}

// ═══════════════════════════════════════════════════════════════════
//  Transaction Animation
// ═══════════════════════════════════════════════════════════════════

export async function animateTransaction(signature: string, description: string) {
  const spinner = createSpinner({
    text: description,
    color: 'cyan',
    spinner: 'dots',
  });
  
  spinner.start();
  
  // Simulate animation stages
  const stages = [
    'Building transaction...',
    'Signing...',
    'Sending to network...',
    'Confirming...',
  ];
  
  for (const stage of stages) {
    spinner.text = chalk.cyan(stage);
    await sleep(500);
  }
  
  spinner.succeed(chalk.green(`Transaction confirmed!`));
  console.log(`${chalk.dim('Signature:')} ${chalk.cyan(signature)}`);
}

// ═══════════════════════════════════════════════════════════════════
//  Helper Functions
// ═══════════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(4) + ' SOL';
}

export function formatAddress(address: string, length: number = 4): string {
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
}

// ═══════════════════════════════════════════════════════════════════
//  Table Display
// ═══════════════════════════════════════════════════════════════════

export interface TableColumn {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

export function displayTable(columns: TableColumn[], data: any[]) {
  // Header
  const header = columns.map(col => 
    chalk.cyan.bold(col.header.padEnd(col.width))
  ).join(' ');
  
  console.log(`\n${header}`);
  console.log(chalk.gray('─'.repeat(columns.reduce((sum, col) => sum + col.width + 1, 0))));
  
  // Rows
  data.forEach(row => {
    const cells = columns.map(col => {
      const value = String(row[col.key] || '');
      const padded = value.padEnd(col.width);
      return chalk.white(padded);
    });
    
    console.log(cells.join(' '));
  });
  
  console.log();
}
