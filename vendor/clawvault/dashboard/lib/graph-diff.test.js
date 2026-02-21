import { describe, expect, it } from 'vitest';
import { diffGraphs } from './graph-diff.js';

describe('diffGraphs', () => {
  it('detects node and edge additions, updates, and removals', () => {
    const previous = {
      nodes: [
        { id: 'a', title: 'A', category: 'root', tags: [], path: 'a.md', missing: false, degree: 1 },
        { id: 'b', title: 'B', category: 'root', tags: ['x'], path: 'b.md', missing: false, degree: 1 },
        { id: 'c', title: 'C', category: 'root', tags: [], path: null, missing: true, degree: 0 }
      ],
      edges: [{ source: 'a', target: 'b' }],
      stats: { nodeCount: 3, edgeCount: 1 }
    };

    const next = {
      nodes: [
        { id: 'a', title: 'A Updated', category: 'root', tags: [], path: 'a.md', missing: false, degree: 1 },
        { id: 'b', title: 'B', category: 'root', tags: ['x'], path: 'b.md', missing: false, degree: 2 },
        { id: 'd', title: 'D', category: 'projects', tags: [], path: 'd.md', missing: false, degree: 1 }
      ],
      edges: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'd' }
      ],
      stats: { nodeCount: 3, edgeCount: 2 }
    };

    const patch = diffGraphs(previous, next);

    expect(patch.addedNodes).toEqual([next.nodes[2]]);
    expect(patch.updatedNodes).toEqual(expect.arrayContaining([next.nodes[0], next.nodes[1]]));
    expect(patch.removedNodeIds).toEqual(['c']);
    expect(patch.addedEdges).toEqual([{ source: 'b', target: 'd' }]);
    expect(patch.removedEdges).toEqual([]);
    expect(patch.changedNodeIds).toEqual(['a', 'b', 'c', 'd']);
    expect(patch.hasChanges).toBe(true);
  });

  it('returns hasChanges=false for equivalent graphs', () => {
    const graph = {
      nodes: [{ id: 'a', title: 'A', category: 'root', tags: ['t'], path: 'a.md', missing: false, degree: 0 }],
      edges: [],
      stats: { nodeCount: 1, edgeCount: 0 }
    };

    const patch = diffGraphs(graph, structuredClone(graph));

    expect(patch.hasChanges).toBe(false);
    expect(patch.addedNodes).toEqual([]);
    expect(patch.updatedNodes).toEqual([]);
    expect(patch.removedNodeIds).toEqual([]);
    expect(patch.addedEdges).toEqual([]);
    expect(patch.removedEdges).toEqual([]);
  });

  it('treats edge type changes as edge diff', () => {
    const previous = {
      nodes: [
        { id: 'a', title: 'A', category: 'root', tags: [], path: 'a.md', missing: false, degree: 1 },
        { id: 'b', title: 'B', category: 'root', tags: [], path: 'b.md', missing: false, degree: 1 }
      ],
      edges: [{ source: 'a', target: 'b', type: 'wiki_link' }]
    };
    const next = {
      nodes: previous.nodes,
      edges: [{ source: 'a', target: 'b', type: 'frontmatter_relation', label: 'related' }]
    };

    const patch = diffGraphs(previous, next);
    expect(patch.addedEdges).toEqual([{ source: 'a', target: 'b', type: 'frontmatter_relation', label: 'related' }]);
    expect(patch.removedEdges).toEqual([{ source: 'a', target: 'b', type: 'wiki_link' }]);
    expect(patch.hasChanges).toBe(true);
  });
});
