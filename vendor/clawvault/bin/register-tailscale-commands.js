/**
 * Tailscale networking command registrations.
 * Provides vault synchronization over Tailscale networks.
 */

export function registerTailscaleCommands(program, { chalk }) {
  // === TAILSCALE-STATUS ===
  program
    .command('tailscale-status')
    .alias('ts-status')
    .description('Show Tailscale connection status and peers')
    .option('--json', 'Output as JSON')
    .option('--peers', 'Show all peers including offline')
    .action(async (options) => {
      try {
        const { tailscaleStatusCommand } = await import('../dist/commands/tailscale.js');
        await tailscaleStatusCommand({
          json: options.json,
          peers: options.peers
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === TAILSCALE-SYNC ===
  program
    .command('tailscale-sync')
    .alias('ts-sync')
    .description('Sync vault with a peer on the Tailscale network')
    .requiredOption('--peer <hostname>', 'Peer hostname or IP to sync with')
    .option('-v, --vault <path>', 'Vault path')
    .option('--port <number>', 'Port on the peer (default: 8384)', parseInt)
    .option('--direction <dir>', 'Sync direction: push, pull, or bidirectional (default: bidirectional)', 'bidirectional')
    .option('--dry-run', 'Show what would be synced without making changes')
    .option('--delete-orphans', 'Delete files that exist locally but not on peer (pull only)')
    .option('--categories <list>', 'Comma-separated list of categories to sync')
    .option('--https', 'Use HTTPS for connection')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const { tailscaleSyncCommand } = await import('../dist/commands/tailscale.js');
        await tailscaleSyncCommand({
          peer: options.peer,
          vaultPath: options.vault,
          port: options.port,
          direction: options.direction,
          dryRun: options.dryRun,
          deleteOrphans: options.deleteOrphans,
          categories: options.categories?.split(',').map(c => c.trim()),
          https: options.https,
          json: options.json
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === TAILSCALE-SERVE ===
  program
    .command('tailscale-serve')
    .alias('ts-serve')
    .description('Serve vault for sync over Tailscale')
    .option('-v, --vault <path>', 'Vault path')
    .option('--port <number>', 'Port to serve on (default: 8384)', parseInt)
    .option('--funnel', 'Expose via Tailscale Funnel (public internet)')
    .option('--background', 'Run in background')
    .option('--stop', 'Stop serving')
    .action(async (options) => {
      try {
        const { tailscaleServeCommand } = await import('../dist/commands/tailscale.js');
        await tailscaleServeCommand({
          vaultPath: options.vault,
          port: options.port,
          funnel: options.funnel,
          background: options.background,
          stop: options.stop
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });

  // === TAILSCALE-DISCOVER ===
  program
    .command('tailscale-discover')
    .alias('ts-discover')
    .description('Discover ClawVault peers on the Tailscale network')
    .option('--port <number>', 'Port to check (default: 8384)', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const { tailscaleDiscoverCommand } = await import('../dist/commands/tailscale.js');
        await tailscaleDiscoverCommand({
          port: options.port,
          json: options.json
        });
      } catch (err) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
