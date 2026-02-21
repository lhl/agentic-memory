import type { Canvas } from './canvas-layout.js';
import { generateDefaultCanvas } from './canvas-default-template.js';

export function generateCanvas(vaultPath: string): Canvas {
  return generateDefaultCanvas(vaultPath);
}
