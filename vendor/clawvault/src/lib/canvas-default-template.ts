import * as fs from 'fs';
import * as path from 'path';
import { listObservationFiles } from './ledger.js';
import { loadMemoryGraphIndex } from './memory-graph.js';
import {
  listTasks,
  type Task,
  type TaskStatus
} from './task-utils.js';
import {
  type Canvas,
  type CanvasNode,
  CANVAS_COLORS,
  LAYOUT,
  createGroupWithNodes,
  createTextNode,
  flattenGroups,
  positionGroupsVertically,
  truncateText,
  type GroupWithNodes
} from './canvas-layout.js';

const STATUS_ORDER: TaskStatus[] = ['in-progress', 'open', 'blocked', 'done'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  'in-progress': 'In Progress',
  open: 'Open',
  blocked: 'Blocked',
  done: 'Done'
};
const STATUS_COLORS: Record<TaskStatus, string | undefined> = {
  'in-progress': CANVAS_COLORS.ORANGE,
  open: undefined,
  blocked: CANVAS_COLORS.RED,
  done: CANVAS_COLORS.GREEN
};

function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const grouped: Record<TaskStatus, Task[]> = {
    open: [],
    'in-progress': [],
    blocked: [],
    done: []
  };

  for (const task of tasks) {
    grouped[task.frontmatter.status].push(task);
  }
  return grouped;
}

function readObservationTitle(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch?.[1]) {
      return truncateText(headingMatch[1].trim(), 44);
    }

    const firstBodyLine = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && line !== '---' && !line.includes(':'));
    return firstBodyLine ? truncateText(firstBodyLine, 44) : null;
  } catch {
    return null;
  }
}

function buildTaskStatusGroup(tasks: Task[]): GroupWithNodes {
  const grouped = groupTasksByStatus(tasks);
  const summaryLines = STATUS_ORDER.map((status) => `${STATUS_LABELS[status]}: ${grouped[status].length}`);
  const childNodes: CanvasNode[] = [
    createTextNode(
      0,
      0,
      LAYOUT.DEFAULT_NODE_WIDTH,
      LAYOUT.SMALL_NODE_HEIGHT + 24,
      `**Tasks by Status**\n\nTotal: ${tasks.length}\n${summaryLines.join('\n')}`
    )
  ];

  for (const status of STATUS_ORDER) {
    const bucket = grouped[status];
    const lines = bucket.length === 0
      ? ['- none']
      : bucket.slice(0, 6).map((task) => `- ${truncateText(task.title, 42)}`);
    if (bucket.length > 6) {
      lines.push(`- ... and ${bucket.length - 6} more`);
    }

    childNodes.push(
      createTextNode(
        0,
        0,
        LAYOUT.DEFAULT_NODE_WIDTH,
        LAYOUT.SMALL_NODE_HEIGHT + (lines.length * 18),
        `**${STATUS_LABELS[status]} (${bucket.length})**\n\n${lines.join('\n')}`,
        STATUS_COLORS[status]
      )
    );
  }

  return createGroupWithNodes(
    LAYOUT.LEFT_COLUMN_X,
    0,
    LAYOUT.LEFT_COLUMN_WIDTH,
    'Vault Status',
    childNodes,
    CANVAS_COLORS.CYAN
  );
}

function buildRecentObservationsGroup(vaultPath: string): GroupWithNodes {
  const observations = listObservationFiles(vaultPath, { includeLegacy: true, includeArchive: false });
  const recent = observations.slice(-8).reverse();
  const lines = recent.length === 0
    ? ['- none']
    : recent.map((entry) => {
      const title = readObservationTitle(entry.path);
      return title ? `- ${entry.date}: ${title}` : `- ${entry.date}`;
    });

  const text = [
    '**Recent Observations**',
    '',
    `Total days: ${observations.length}`,
    '',
    ...lines
  ].join('\n');

  return createGroupWithNodes(
    LAYOUT.LEFT_COLUMN_X,
    0,
    LAYOUT.LEFT_COLUMN_WIDTH,
    'Recent Observations',
    [createTextNode(0, 0, LAYOUT.DEFAULT_NODE_WIDTH, LAYOUT.DEFAULT_NODE_HEIGHT + (lines.length * 18), text)],
    CANVAS_COLORS.CYAN
  );
}

function buildGraphStatsGroup(vaultPath: string): GroupWithNodes {
  const graph = loadMemoryGraphIndex(vaultPath)?.graph;
  const textLines = ['**Graph Stats**', ''];

  if (!graph) {
    textLines.push('Graph index not found.');
    textLines.push('Run `clawvault graph --build` to populate it.');
  } else {
    textLines.push(`Nodes: ${graph.stats.nodeCount}`);
    textLines.push(`Edges: ${graph.stats.edgeCount}`);
    textLines.push('');
    textLines.push('Node types:');
    const nodeTypeLines = Object.entries(graph.stats.nodeTypeCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([type, count]) => `- ${type}: ${count}`);
    textLines.push(...(nodeTypeLines.length > 0 ? nodeTypeLines : ['- none']));
  }

  return createGroupWithNodes(
    LAYOUT.LEFT_COLUMN_X,
    0,
    LAYOUT.LEFT_COLUMN_WIDTH,
    'Graph Stats',
    [
      createTextNode(
        0,
        0,
        LAYOUT.DEFAULT_NODE_WIDTH,
        LAYOUT.DEFAULT_NODE_HEIGHT + ((textLines.length - 1) * 16),
        textLines.join('\n')
      )
    ],
    CANVAS_COLORS.PURPLE
  );
}

export function generateDefaultCanvas(vaultPath: string): Canvas {
  const resolvedPath = path.resolve(vaultPath);
  const tasks = listTasks(resolvedPath);
  const groups = positionGroupsVertically([
    buildTaskStatusGroup(tasks),
    buildRecentObservationsGroup(resolvedPath),
    buildGraphStatsGroup(resolvedPath)
  ]);

  return {
    nodes: flattenGroups(groups),
    edges: []
  };
}
