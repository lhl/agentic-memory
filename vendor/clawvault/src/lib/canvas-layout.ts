/**
 * Canvas layout utilities for ClawVault
 * Handles JSON Canvas generation with proper positioning and grouping
 */

import * as crypto from 'crypto';

// JSON Canvas spec types
export interface CanvasNode {
  id: string;
  type: 'text' | 'file' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  file?: string;
  label?: string;
  color?: string;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  toNode: string;
  toSide: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  color?: string;
}

export interface Canvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

// Color constants (JSON Canvas spec)
export const CANVAS_COLORS = {
  RED: '1',      // Critical, blocked
  ORANGE: '2',   // High priority
  YELLOW: '3',   // Medium priority
  GREEN: '4',    // Done, success
  CYAN: '5',     // Stats
  PURPLE: '6'    // Knowledge graph
} as const;

// Layout constants
export const LAYOUT = {
  LEFT_COLUMN_X: 0,
  LEFT_COLUMN_WIDTH: 500,
  RIGHT_COLUMN_X: 550,
  RIGHT_COLUMN_WIDTH: 450,
  GROUP_PADDING: 20,
  NODE_SPACING: 15,
  GROUP_SPACING: 50,
  DEFAULT_NODE_WIDTH: 280,
  DEFAULT_NODE_HEIGHT: 80,
  FILE_NODE_HEIGHT: 60,
  SMALL_NODE_HEIGHT: 50,
  GROUP_HEADER_HEIGHT: 40
} as const;

/**
 * Generate a 16-character lowercase hex ID
 */
export function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Create a text node
 */
export function createTextNode(
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  color?: string
): CanvasNode {
  const node: CanvasNode = {
    id: generateId(),
    type: 'text',
    x,
    y,
    width,
    height,
    text
  };
  if (color) node.color = color;
  return node;
}

/**
 * Create a file node
 */
export function createFileNode(
  x: number,
  y: number,
  width: number,
  height: number,
  file: string,
  color?: string
): CanvasNode {
  const node: CanvasNode = {
    id: generateId(),
    type: 'file',
    x,
    y,
    width,
    height,
    file
  };
  if (color) node.color = color;
  return node;
}

/**
 * Create a group node
 */
export function createGroupNode(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  color?: string
): CanvasNode {
  const node: CanvasNode = {
    id: generateId(),
    type: 'group',
    x,
    y,
    width,
    height,
    label
  };
  if (color) node.color = color;
  return node;
}

/**
 * Create an edge between nodes
 */
export function createEdge(
  fromNode: string,
  fromSide: 'top' | 'right' | 'bottom' | 'left',
  toNode: string,
  toSide: 'top' | 'right' | 'bottom' | 'left',
  label?: string,
  color?: string
): CanvasEdge {
  const edge: CanvasEdge = {
    id: generateId(),
    fromNode,
    fromSide,
    toNode,
    toSide
  };
  if (label) edge.label = label;
  if (color) edge.color = color;
  return edge;
}

/**
 * Layout helper for vertical stacking of nodes within a group
 */
export interface StackedLayout {
  nodes: CanvasNode[];
  totalHeight: number;
}

export function stackNodesVertically(
  nodes: CanvasNode[],
  startX: number,
  startY: number,
  spacing: number = LAYOUT.NODE_SPACING
): StackedLayout {
  let currentY = startY;
  const positionedNodes: CanvasNode[] = [];

  for (const node of nodes) {
    positionedNodes.push({
      ...node,
      x: startX,
      y: currentY
    });
    currentY += node.height + spacing;
  }

  return {
    nodes: positionedNodes,
    totalHeight: currentY - startY - spacing
  };
}

/**
 * Create a group with contained nodes
 * Returns the group node and positioned child nodes
 */
export interface GroupWithNodes {
  group: CanvasNode;
  nodes: CanvasNode[];
}

export function createGroupWithNodes(
  groupX: number,
  groupY: number,
  groupWidth: number,
  label: string,
  childNodes: CanvasNode[],
  color?: string
): GroupWithNodes {
  const padding = LAYOUT.GROUP_PADDING;
  const headerHeight = LAYOUT.GROUP_HEADER_HEIGHT;
  
  // Position nodes inside the group
  const stacked = stackNodesVertically(
    childNodes,
    groupX + padding,
    groupY + headerHeight + padding
  );

  // Calculate group height based on content
  const groupHeight = headerHeight + padding * 2 + stacked.totalHeight + LAYOUT.NODE_SPACING;

  const group = createGroupNode(groupX, groupY, groupWidth, groupHeight, label, color);

  return {
    group,
    nodes: stacked.nodes
  };
}

/**
 * Get priority color for a task
 */
export function getPriorityColor(priority?: string): string | undefined {
  switch (priority) {
    case 'critical':
      return CANVAS_COLORS.RED;
    case 'high':
      return CANVAS_COLORS.ORANGE;
    case 'medium':
      return CANVAS_COLORS.YELLOW;
    default:
      return undefined;
  }
}

/**
 * Truncate text to fit within a certain width (approximate)
 */
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3) + '...';
}

/**
 * Format markdown text for canvas node
 * Replaces newlines with \n for JSON Canvas spec
 */
export function formatCanvasText(lines: string[]): string {
  return lines.join('\n');
}

/**
 * Calculate the total height needed for a column of groups
 */
export function calculateColumnHeight(groups: GroupWithNodes[]): number {
  let height = 0;
  for (let i = 0; i < groups.length; i++) {
    height += groups[i].group.height;
    if (i < groups.length - 1) {
      height += LAYOUT.GROUP_SPACING;
    }
  }
  return height;
}

/**
 * Position groups vertically in a column
 */
export function positionGroupsVertically(
  groups: GroupWithNodes[],
  startY: number = 0
): GroupWithNodes[] {
  let currentY = startY;
  const positioned: GroupWithNodes[] = [];

  for (const { group, nodes } of groups) {
    const yOffset = currentY - group.y;
    
    positioned.push({
      group: { ...group, y: currentY },
      nodes: nodes.map(n => ({ ...n, y: n.y + yOffset }))
    });

    currentY += group.height + LAYOUT.GROUP_SPACING;
  }

  return positioned;
}

/**
 * Flatten groups and nodes into a single array
 */
export function flattenGroups(groups: GroupWithNodes[]): CanvasNode[] {
  const nodes: CanvasNode[] = [];
  for (const { group, nodes: childNodes } of groups) {
    nodes.push(group);
    nodes.push(...childNodes);
  }
  return nodes;
}
