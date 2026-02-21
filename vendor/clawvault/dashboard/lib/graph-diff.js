function toNodeSignature(node) {
  return JSON.stringify({
    title: node.title,
    category: node.category,
    tags: Array.isArray(node.tags) ? [...node.tags].sort() : [],
    path: node.path,
    missing: Boolean(node.missing),
    degree: Number(node.degree ?? 0)
  });
}

function toEdgeKey(edge) {
  const type = edge.type ?? '';
  const label = edge.label ?? '';
  return `${edge.source}=>${edge.target}:${type}:${label}`;
}

/**
 * Compute an efficient patch between graph snapshots.
 * @param {{nodes: Array<object>, edges: Array<object>, stats?: object}} previousGraph
 * @param {{nodes: Array<object>, edges: Array<object>, stats?: object}} nextGraph
 */
export function diffGraphs(previousGraph, nextGraph) {
  const previousNodes = previousGraph?.nodes ?? [];
  const nextNodes = nextGraph?.nodes ?? [];
  const previousEdges = previousGraph?.edges ?? [];
  const nextEdges = nextGraph?.edges ?? [];

  const previousNodeById = new Map(previousNodes.map((node) => [node.id, node]));
  const nextNodeById = new Map(nextNodes.map((node) => [node.id, node]));

  const addedNodes = [];
  const updatedNodes = [];
  const removedNodeIds = [];

  for (const [nodeId, nextNode] of nextNodeById.entries()) {
    const previousNode = previousNodeById.get(nodeId);
    if (!previousNode) {
      addedNodes.push(nextNode);
      continue;
    }
    if (toNodeSignature(previousNode) !== toNodeSignature(nextNode)) {
      updatedNodes.push(nextNode);
    }
  }

  for (const nodeId of previousNodeById.keys()) {
    if (!nextNodeById.has(nodeId)) {
      removedNodeIds.push(nodeId);
    }
  }

  const previousEdgeByKey = new Map(previousEdges.map((edge) => [toEdgeKey(edge), edge]));
  const nextEdgeByKey = new Map(nextEdges.map((edge) => [toEdgeKey(edge), edge]));
  const addedEdges = [];
  const removedEdges = [];

  for (const [edgeKey, edge] of nextEdgeByKey.entries()) {
    if (!previousEdgeByKey.has(edgeKey)) {
      addedEdges.push(edge);
    }
  }

  for (const [edgeKey, edge] of previousEdgeByKey.entries()) {
    if (!nextEdgeByKey.has(edgeKey)) {
      removedEdges.push(edge);
    }
  }

  const touchedNodeIds = new Set();
  for (const node of addedNodes) {
    touchedNodeIds.add(node.id);
  }
  for (const node of updatedNodes) {
    touchedNodeIds.add(node.id);
  }
  for (const nodeId of removedNodeIds) {
    touchedNodeIds.add(nodeId);
  }
  for (const edge of addedEdges) {
    touchedNodeIds.add(edge.source);
    touchedNodeIds.add(edge.target);
  }
  for (const edge of removedEdges) {
    touchedNodeIds.add(edge.source);
    touchedNodeIds.add(edge.target);
  }

  return {
    addedNodes,
    updatedNodes,
    removedNodeIds,
    addedEdges,
    removedEdges,
    changedNodeIds: Array.from(touchedNodeIds).sort((a, b) => a.localeCompare(b)),
    stats: nextGraph?.stats ?? null,
    hasChanges:
      addedNodes.length > 0 ||
      updatedNodes.length > 0 ||
      removedNodeIds.length > 0 ||
      addedEdges.length > 0 ||
      removedEdges.length > 0
  };
}
