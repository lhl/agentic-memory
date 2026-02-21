import * as fs from 'fs';
import * as path from 'path';
import type { Canvas } from '../lib/canvas-layout.js';
import { generateCanvas as generateCanvasOutput } from '../lib/canvas-templates.js';

export interface CanvasOptions {
  output?: string;
}

/**
 * Generate the vault status canvas.
 */
export function generateCanvas(vaultPath: string): Canvas {
  return generateCanvasOutput(path.resolve(vaultPath));
}

/**
 * Canvas command handler for CLI.
 */
export async function canvasCommand(
  vaultPath: string,
  options: CanvasOptions = {}
): Promise<void> {
  const resolvedPath = path.resolve(vaultPath);
  const outputPath = options.output || path.join(resolvedPath, 'dashboard.canvas');
  const canvas = generateCanvasOutput(resolvedPath);

  fs.writeFileSync(outputPath, JSON.stringify(canvas, null, 2));

  console.log(`✓ Generated canvas: ${outputPath}`);
  console.log(`  Nodes: ${canvas.nodes.length}`);
  console.log(`  Edges: ${canvas.edges.length}`);
}
