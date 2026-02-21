import { buildOrUpdateMemoryGraphIndex, loadMemoryGraphIndex } from '../lib/memory-graph.js';
import { resolveVaultPath } from '../lib/config.js';

export interface GraphSummary {
  schemaVersion: number;
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  nodeTypeCounts: Record<string, number>;
  edgeTypeCounts: Record<string, number>;
  fileCount: number;
}

function formatGraphSummary(summary: GraphSummary): string {
  const lines: string[] = [];
  lines.push('Memory Graph Summary');
  lines.push('-'.repeat(34));
  lines.push(`Schema version: ${summary.schemaVersion}`);
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push(`Files indexed: ${summary.fileCount}`);
  lines.push(`Nodes: ${summary.nodeCount}`);
  lines.push(`Edges: ${summary.edgeCount}`);
  lines.push('');
  lines.push('Node types:');
  for (const [type, count] of Object.entries(summary.nodeTypeCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`  - ${type}: ${count}`);
  }
  lines.push('');
  lines.push('Edge types:');
  for (const [type, count] of Object.entries(summary.edgeTypeCounts).sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`  - ${type}: ${count}`);
  }
  return lines.join('\n');
}

export async function graphSummary(options: {
  vaultPath?: string;
  refresh?: boolean;
  json?: boolean;
} = {}): Promise<GraphSummary> {
  const vaultPath = resolveVaultPath({ explicitPath: options.vaultPath });
  const index = options.refresh
    ? await buildOrUpdateMemoryGraphIndex(vaultPath)
    : loadMemoryGraphIndex(vaultPath) ?? await buildOrUpdateMemoryGraphIndex(vaultPath);

  return {
    schemaVersion: index.schemaVersion,
    generatedAt: index.generatedAt,
    nodeCount: index.graph.stats.nodeCount,
    edgeCount: index.graph.stats.edgeCount,
    nodeTypeCounts: index.graph.stats.nodeTypeCounts,
    edgeTypeCounts: index.graph.stats.edgeTypeCounts,
    fileCount: Object.keys(index.files).length
  };
}

export async function graphCommand(options: {
  vaultPath?: string;
  refresh?: boolean;
  json?: boolean;
} = {}): Promise<void> {
  const summary = await graphSummary(options);
  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  console.log(formatGraphSummary(summary));
}
