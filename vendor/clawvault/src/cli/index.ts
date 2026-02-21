import type { Command } from 'commander';
import { registerContextCommand } from '../commands/context.js';
import { registerInjectCommand } from '../commands/inject.js';
import { registerObserveCommand } from '../commands/observe.js';
import { registerReflectCommand } from '../commands/reflect.js';
import { registerEmbedCommand } from '../commands/embed.js';
import { registerTailscaleCommands } from '../commands/tailscale.js';

export function registerCliCommands(program: Command): Command {
  registerContextCommand(program);
  registerInjectCommand(program);
  registerObserveCommand(program);
  registerReflectCommand(program);
  registerEmbedCommand(program);
  registerTailscaleCommands(program);
  return program;
}
