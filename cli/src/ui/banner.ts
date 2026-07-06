/**
 * @module cli/ui/banner
 * @description Animated ASCII banner for SAP-CLI
 * @since v0.3.0 PRO
 */

import chalk from 'chalk';

// ═══════════════════════════════════════════════════════════════════
//  ASCII Art Frames for Animation
// ═══════════════════════════════════════════════════════════════════

const FRAMES = [
  // Frame 1
  `
 ███████╗ ██████╗ ██████╗ ███╗   ██╗███████╗██╗      ██████╗ ██╗    ██╗
 ██╔════╝██╔═══██╗██╔══██╗████╗  ██║██╔════╝██║     ██╔═══██╗██║    ██║
 ███████╗██║   ██║██████╔╝██╔██╗ ██║█████╗  ██║     ██║   ██║██║ █╗ ██║
 ╚════██║██║   ██║██╔══██╗██║╚██╗██║██╔══╝  ██║     ██║   ██║██║███╗██║
 ███████║╚██████╔╝██║  ██║██║ ╚████║███████╗███████╗╚██████╔╝╚███╔███╔╝
 ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝ ╚═════╝  ╚══╝╚══╝ 
  `,
  // Frame 2
  `
 ███████╗ ██████╗ ██████╗ ███╗   ██╗███████╗██╗      ██████╗ ██╗    ██╗
 ██╔════╝██╔═══██╗██╔══██╗████╗  ██║██╔════╝██║     ██╔═══██╗██║    ██║
 ███████╗██║   ██║██████╔╝██╔██╗ ██║█████╗  ██║     ██║   ██║██║ █╗ ██║
 ╚════██║██║   ██║██╔══██╗██║╚██╗██║██╔══╝  ██║     ██║   ██║██║███╗██║
 ███████║╚██████╔╝██║  ██║██║ ╚████║███████╗███████╗╚██████╔╝╚███╔███╔╝
 ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝ ╚═════╝  ╚══╝╚══╝ 
  `,
  // Frame 3
  `
 ███████╗ ██████╗ ██████╗ ███╗   ██╗███████╗██╗      ██████╗ ██╗    ██╗
 ██╔════╝██╔═══██╗██╔══██╗████╗  ██║██╔════╝██║     ██╔═══██╗██║    ██║
 ███████╗██║   ██║██████╔╝██╔██╗ ██║█████╗  ██║     ██║   ██║██║ █╗ ██║
 ╚════██║██║   ██║██╔══██╗██║╚██╗██║██╔══╝  ██║     ██║   ██║██║███╗██║
 ███████║╚██████╔╝██║  ██║██║ ╚████║███████╗███████╗╚██████╔╝╚███╔███╔╝
 ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝ ╚═════╝  ╚══╝╚══╝ 
  `,
];

// ═══════════════════════════════════════════════════════════════════
//  Color Schemes
// ═══════════════════════════════════════════════════════════════════

const COLOR_SCHEMES = {
  rainbow: [
    chalk.cyan.bold,
    chalk.blue.bold,
    chalk.magenta.bold,
    chalk.green.bold,
    chalk.yellow.bold,
  ],
  ocean: [
    chalk.cyan.bold,
    chalk.blueBright.bold,
    chalk.blue.bold,
  ],
  fire: [
    chalk.red.bold,
    chalk.redBright.bold,
    chalk.yellow.bold,
  ],
  matrix: [
    chalk.green.bold,
    chalk.greenBright.bold,
  ],
  sunset: [
    chalk.red.bold,
    chalk.magenta.bold,
    chalk.blue.bold,
  ],
};

// ═══════════════════════════════════════════════════════════════════
//  Animated Banner
// ═══════════════════════════════════════════════════════════════════

export interface AnimatedBannerOptions {
  scheme?: 'rainbow' | 'ocean' | 'fire' | 'matrix' | 'sunset';
  speed?: number; // ms per frame
  loops?: number; // number of animation loops (0 = infinite)
  subtitle?: string;
}

export async function showAnimatedBanner(
  options: AnimatedBannerOptions = {}
): Promise<void> {
  const {
    scheme = 'rainbow',
    speed = 300,
    loops = 2,
    subtitle = 'v0.3.0 Commerce Edition',
  } = options;

  const colors = COLOR_SCHEMES[scheme];
  const banner = FRAMES[0]; // Static frame for now
  
  // Apply gradient effect
  const lines = banner.split('\n');
  const coloredLines = lines.map((line, idx) => {
    const colorIdx = idx % colors.length;
    return colors[colorIdx](line);
  });

  console.log(coloredLines.join(''));
  
  // Subtitle
  console.log(chalk.gray('─'.repeat(60)));
  console.log(
    chalk.yellow.bold(subtitle) +
    chalk.gray(' | ') +
    chalk.green.bold('MAINNET READY')
  );
  console.log(chalk.gray('─'.repeat(60)));
  console.log(
    chalk.dim('Treasury:') +
    ' ' +
    chalk.cyan('J7PyZAGKvprCz4SQ5DKBLAHstJxgVqZcz6kguUoWpP7P')
  );
  console.log(
    chalk.dim('Program:') +
    ' ' +
    chalk.cyan('SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ')
  );
  console.log();
}

// ═══════════════════════════════════════════════════════════════════
//  Static Banner (for --version, --help)
// ═══════════════════════════════════════════════════════════════════

export const ASCII_BANNER = `
${chalk.hex('#9333EA').bold(`
 @@@@@@  @@@@@@  @@@@@@@      @@@@@@@ @@@      @@@ @@@@@@@@ @@@  @@@ @@@@@@@  
!@@     @@!  @@@ @@!  @@@    !@@      @@!      @@! @@!      @@!@!@@@   @!!    
 !@@!!  @!@!@!@! @!@@!@!     !@!      @!!      !!@ @!!!:!   @!@@!!@!   @!!    
    !:! !!:  !!! !!:         :!!      !!:      !!: !!:      !!:  !!!   !!:    
::.: :   :   : :  :           :: :: : : ::.: : :   : :: ::  ::    :     :    
`)}
${chalk.hex('#06B6D4').bold(`
 @@@@@@@@ @@@@@@@   @@@@@@   @@@@@@@
@@!      @@!  @@@ @@!  @@@  @@!  @@@
@!!!:!   @!@!@!@! @!@!@!@!  @!@!!@!  
!!:      !!:  !!! !!:  !!!  !!:  !!!  
: :: :: : :   : :  :   : :   :   : :  
`)}
${chalk.gray('─'.repeat(60))}
${chalk.yellow.bold('v0.3.0 Commerce Edition')} ${chalk.gray('|')} ${chalk.green.bold('MAINNET READY')}
${chalk.gray('─'.repeat(60))}
${chalk.dim('Treasury:')} ${chalk.hex('#9333EA')('J7PyZAGKvprCz4SQ5DKBLAHstJxgVqZcz6kguUoWpP7P')}
${chalk.dim('Program:')} ${chalk.hex('#06B6D4')('SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ')}
`;

// ═══════════════════════════════════════════════════════════════════
//  Typewriter Effect
// ═══════════════════════════════════════════════════════════════════

export async function typewriterEffect(
  text: string,
  speed: number = 50
): Promise<void> {
  for (let i = 0; i < text.length; i++) {
    process.stdout.write(text[i]);
    await new Promise((resolve) => setTimeout(resolve, speed));
  }
  console.log();
}

// ═══════════════════════════════════════════════════════════════════
//  Loading Animation
// ═══════════════════════════════════════════════════════════════════

export async function loadingAnimation(
  message: string,
  duration: number = 2000
): Promise<void> {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const start = Date.now();
  let frameIndex = 0;

  const interval = setInterval(() => {
    if (Date.now() - start > duration) {
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      return;
    }

    process.stdout.write(`\r${chalk.cyan(frames[frameIndex])} ${message}`);
    frameIndex = (frameIndex + 1) % frames.length;
  }, 80);

  return new Promise((resolve) => {
    setTimeout(() => {
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      resolve();
    }, duration);
  });
}
