import { describe, expect, it } from 'vitest';
import {
  generateId,
  createTextNode,
  createFileNode,
  createGroupNode,
  createEdge,
  createGroupWithNodes,
  stackNodesVertically,
  getPriorityColor,
  truncateText,
  formatCanvasText,
  CANVAS_COLORS,
  LAYOUT
} from './canvas-layout.js';

describe('canvas-layout', () => {
  describe('generateId', () => {
    it('generates 16-character hex string', () => {
      const id = generateId();
      expect(id).toHaveLength(16);
      expect(/^[0-9a-f]+$/.test(id)).toBe(true);
    });

    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('createTextNode', () => {
    it('creates text node with required fields', () => {
      const node = createTextNode(100, 200, 300, 80, 'Hello World');

      expect(node.type).toBe('text');
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
      expect(node.width).toBe(300);
      expect(node.height).toBe(80);
      expect(node.text).toBe('Hello World');
      expect(node.id).toHaveLength(16);
    });

    it('includes color when provided', () => {
      const node = createTextNode(0, 0, 100, 50, 'Test', CANVAS_COLORS.RED);
      expect(node.color).toBe('1');
    });

    it('omits color when not provided', () => {
      const node = createTextNode(0, 0, 100, 50, 'Test');
      expect(node.color).toBeUndefined();
    });
  });

  describe('createFileNode', () => {
    it('creates file node with required fields', () => {
      const node = createFileNode(100, 200, 300, 60, 'tasks/my-task.md');

      expect(node.type).toBe('file');
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
      expect(node.width).toBe(300);
      expect(node.height).toBe(60);
      expect(node.file).toBe('tasks/my-task.md');
    });

    it('includes color when provided', () => {
      const node = createFileNode(0, 0, 100, 50, 'test.md', CANVAS_COLORS.GREEN);
      expect(node.color).toBe('4');
    });
  });

  describe('createGroupNode', () => {
    it('creates group node with required fields', () => {
      const node = createGroupNode(0, 0, 500, 400, 'My Group');

      expect(node.type).toBe('group');
      expect(node.width).toBe(500);
      expect(node.height).toBe(400);
      expect(node.label).toBe('My Group');
    });

    it('includes color when provided', () => {
      const node = createGroupNode(0, 0, 100, 100, 'Test', CANVAS_COLORS.PURPLE);
      expect(node.color).toBe('6');
    });
  });

  describe('createEdge', () => {
    it('creates edge with required fields', () => {
      const edge = createEdge('node1', 'right', 'node2', 'left');

      expect(edge.fromNode).toBe('node1');
      expect(edge.fromSide).toBe('right');
      expect(edge.toNode).toBe('node2');
      expect(edge.toSide).toBe('left');
      expect(edge.id).toHaveLength(16);
    });

    it('includes label when provided', () => {
      const edge = createEdge('a', 'right', 'b', 'left', 'blocked by');
      expect(edge.label).toBe('blocked by');
    });

    it('includes color when provided', () => {
      const edge = createEdge('a', 'right', 'b', 'left', undefined, CANVAS_COLORS.RED);
      expect(edge.color).toBe('1');
    });
  });

  describe('stackNodesVertically', () => {
    it('positions nodes vertically', () => {
      const nodes = [
        createTextNode(0, 0, 100, 50, 'A'),
        createTextNode(0, 0, 100, 60, 'B'),
        createTextNode(0, 0, 100, 40, 'C')
      ];

      const result = stackNodesVertically(nodes, 100, 200, 10);

      expect(result.nodes[0].x).toBe(100);
      expect(result.nodes[0].y).toBe(200);
      expect(result.nodes[1].y).toBe(260); // 200 + 50 + 10
      expect(result.nodes[2].y).toBe(330); // 260 + 60 + 10
    });

    it('calculates total height', () => {
      const nodes = [
        createTextNode(0, 0, 100, 50, 'A'),
        createTextNode(0, 0, 100, 50, 'B')
      ];

      const result = stackNodesVertically(nodes, 0, 0, 10);
      // Total height: (50 + 10) + 50 = 110, minus trailing spacing = 100
      // But the function calculates: currentY - startY - spacing
      // currentY after loop: 0 + 50 + 10 + 50 + 10 = 120
      // totalHeight: 120 - 0 - 10 = 110
      expect(result.totalHeight).toBe(110);
    });
  });

  describe('createGroupWithNodes', () => {
    it('creates group containing positioned nodes', () => {
      const childNodes = [
        createTextNode(0, 0, 100, 50, 'A'),
        createTextNode(0, 0, 100, 50, 'B')
      ];

      const result = createGroupWithNodes(0, 0, 500, 'Test Group', childNodes);

      expect(result.group.type).toBe('group');
      expect(result.group.label).toBe('Test Group');
      expect(result.nodes).toHaveLength(2);
      
      // Nodes should be positioned inside the group
      expect(result.nodes[0].x).toBe(LAYOUT.GROUP_PADDING);
      expect(result.nodes[0].y).toBeGreaterThan(0);
    });

    it('applies color to group', () => {
      const result = createGroupWithNodes(0, 0, 500, 'Test', [], CANVAS_COLORS.CYAN);
      expect(result.group.color).toBe('5');
    });
  });

  describe('getPriorityColor', () => {
    it('returns correct colors for priorities', () => {
      expect(getPriorityColor('critical')).toBe(CANVAS_COLORS.RED);
      expect(getPriorityColor('high')).toBe(CANVAS_COLORS.ORANGE);
      expect(getPriorityColor('medium')).toBe(CANVAS_COLORS.YELLOW);
      expect(getPriorityColor('low')).toBeUndefined();
      expect(getPriorityColor(undefined)).toBeUndefined();
    });
  });

  describe('truncateText', () => {
    it('returns text unchanged if within limit', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('truncates text with ellipsis', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });
  });

  describe('formatCanvasText', () => {
    it('joins lines with newlines', () => {
      const result = formatCanvasText(['Line 1', 'Line 2', 'Line 3']);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('CANVAS_COLORS', () => {
    it('has correct color values', () => {
      expect(CANVAS_COLORS.RED).toBe('1');
      expect(CANVAS_COLORS.ORANGE).toBe('2');
      expect(CANVAS_COLORS.YELLOW).toBe('3');
      expect(CANVAS_COLORS.GREEN).toBe('4');
      expect(CANVAS_COLORS.CYAN).toBe('5');
      expect(CANVAS_COLORS.PURPLE).toBe('6');
    });
  });
});
