const CATEGORY_COLORS = {
  decisions: '#ff8b6a',
  lessons: '#7af5e9',
  people: '#ff8ea9',
  projects: '#9ec6ff',
  commitments: '#ffe18d',
  research: '#9bf7bd',
  unresolved: '#ffb363',
  root: '#b4bcd1',
  default: '#9dadc5'
};

const DIMMED_NODE_COLOR = 'rgba(67, 85, 108, 0.45)';
const DIMMED_LINK_COLOR = 'rgba(117, 138, 166, 0.16)';
const NORMAL_LINK_COLOR = 'rgba(167, 189, 214, 0.34)';
const HIGHLIGHT_LINK_COLOR = 'rgba(239, 247, 255, 0.92)';

const FILTER_DEBOUNCE_MS = 120;
const GRAPH_UPDATE_THROTTLE_MS = 1_000;

const state = {
  allNodeById: new Map(),
  allEdgeByKey: new Map(),
  neighborsByNodeId: new Map(),
  linksByNodeId: new Map(),
  searchTerm: '',
  category: 'all',
  tag: 'all',
  nodeType: 'all',
  visibleNodeIds: new Set(),
  hoveredNodeId: null,
  selectedNodeId: null,
  highlightedNodeIds: new Set(),
  highlightedEdgeKeys: new Set(),
  stats: null,
  wsVersion: 0,
  wsConnected: false,
  tvMode: false,
  lastInteractionAt: performance.now(),
  filterDebounce: null,
  graphDataThrottleTimer: null,
  pendingGraphData: null,
  lastGraphDataApplyAt: 0
};

const graphElement = document.querySelector('#graph');
const detailsElement = document.querySelector('#node-details');
const statsElement = document.querySelector('#stats');
const searchElement = document.querySelector('#search');
const categoryFilterElement = document.querySelector('#category-filter');
const tagFilterElement = document.querySelector('#tag-filter');
const nodeTypeFilterElement = document.querySelector('#node-type-filter');
const refreshButtonElement = document.querySelector('#refresh');
const tvModeButtonElement = document.querySelector('#tv-mode');
const realtimeStatusElement = document.querySelector('#realtime-status');

if (typeof window.ForceGraph !== 'function') {
  statsElement.textContent = 'ForceGraph failed to load.';
  throw new Error('force-graph library unavailable');
}

const graph = window
  .ForceGraph()(graphElement)
  .backgroundColor('#070a10')
  .nodeId('id')
  .linkSource('source')
  .linkTarget('target')
  .nodeRelSize(4)
  .d3AlphaDecay(0.018)
  .d3VelocityDecay(0.24)
  .cooldownTicks(90)
  .linkColor((link) => getLinkColor(link))
  .linkWidth((link) => getLinkWidth(link))
  .linkDirectionalParticles(0)
  .nodeCanvasObject((node, ctx, globalScale) => renderNode(node, ctx, globalScale))
  .nodePointerAreaPaint((node, color, ctx) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, getNodeRadius(node) + 3, 0, Math.PI * 2, false);
    ctx.fill();
  })
  .onNodeHover((node) => {
    const nextHoveredNodeId = node?.id ?? null;
    if (nextHoveredNodeId === state.hoveredNodeId) {
      return;
    }
    state.hoveredNodeId = nextHoveredNodeId;
    markInteraction();
    syncHighlights();
  })
  .onNodeClick((node) => {
    markInteraction();
    selectNode(node);
  })
  .onBackgroundClick(() => {
    markInteraction();
    state.selectedNodeId = null;
    syncHighlights();
    renderEmptyDetails();
  });

resizeGraphToContainer();
window.addEventListener('resize', resizeGraphToContainer);

searchElement.addEventListener('input', (event) => {
  state.searchTerm = String(event.target.value ?? '').trim().toLowerCase();
  markInteraction();
  scheduleFilterApply();
});

categoryFilterElement.addEventListener('change', (event) => {
  state.category = String(event.target.value ?? 'all');
  markInteraction();
  applyFiltersAndRender({ shouldLazyLoad: false });
});

tagFilterElement.addEventListener('change', (event) => {
  state.tag = String(event.target.value ?? 'all');
  markInteraction();
  applyFiltersAndRender({ shouldLazyLoad: false });
});

nodeTypeFilterElement.addEventListener('change', (event) => {
  state.nodeType = String(event.target.value ?? 'all');
  markInteraction();
  applyFiltersAndRender({ shouldLazyLoad: false });
});

refreshButtonElement.addEventListener('click', async () => {
  markInteraction();
  await fetchSnapshot({ refresh: true });
});

tvModeButtonElement.addEventListener('click', () => {
  markInteraction();
  setTvMode(!state.tvMode, { updateQuery: true, useFullscreen: true });
});

detailsElement.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const linkedNodeId = target.dataset.nodeId;
  if (!linkedNodeId) {
    return;
  }
  event.preventDefault();
  const node = state.allNodeById.get(linkedNodeId);
  if (node) {
    markInteraction();
    selectNode(node);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 't') {
    setTvMode(!state.tvMode, { updateQuery: true, useFullscreen: true });
  }
});

for (const eventName of ['pointermove', 'wheel', 'keydown']) {
  window.addEventListener(eventName, () => {
    markInteraction();
  });
}

const initialParams = new URLSearchParams(window.location.search);
if (initialParams.get('tv') === '1') {
  setTvMode(true, { updateQuery: false, useFullscreen: false });
}
if (initialParams.get('webgl') === '1') {
  enableWebglRendererIfSupported();
}
if (initialParams.get('realtime') === '1') {
  startRealtime();
} else {
  setRealtimeStatus({ text: 'Realtime: disabled (stability mode)', level: 'warn' });
}

void fetchSnapshot();

function resizeGraphToContainer() {
  graph.width(graphElement.clientWidth);
  graph.height(graphElement.clientHeight);
}

async function fetchSnapshot({ refresh = false } = {}) {
  refreshButtonElement.disabled = true;
  statsElement.textContent = 'Loading graph...';
  try {
    const response = await fetch(refresh ? '/api/graph?refresh=1' : '/api/graph');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    applySnapshot(payload, { shouldLazyLoad: true, shouldFit: true });
  } catch (error) {
    statsElement.textContent = `Failed to load graph: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    refreshButtonElement.disabled = false;
  }
}

function applySnapshot(payload, { shouldLazyLoad, shouldFit }) {
  const nextNodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const nextEdges = Array.isArray(payload?.edges) ? payload.edges : [];

  state.allNodeById = new Map();
  for (const node of nextNodes) {
    state.allNodeById.set(node.id, { ...node });
  }

  state.allEdgeByKey = new Map();
  for (const edge of nextEdges) {
    const sourceId = String(edge.source);
    const targetId = String(edge.target);
    const edgeType = String(edge.type ?? '');
    const edgeLabel = String(edge.label ?? '');
    const edgeKey = toEdgeKey(sourceId, targetId, edgeType, edgeLabel);
    state.allEdgeByKey.set(edgeKey, {
      key: edgeKey,
      source: sourceId,
      target: targetId,
      type: edgeType,
      label: edgeLabel
    });
  }

  state.stats = payload?.stats ?? null;
  rebuildConnectionIndexes();
  populateFilters();
  applyFiltersAndRender({ shouldLazyLoad });
  syncHighlights();
  if (shouldFit) {
    graph.zoomToFit(700, 100);
  }
  if (state.selectedNodeId) {
    const selectedNode = state.allNodeById.get(state.selectedNodeId);
    if (selectedNode) {
      renderDetails(selectedNode);
    } else {
      state.selectedNodeId = null;
      renderEmptyDetails();
    }
  } else {
    renderEmptyDetails();
  }
  updateStats();
}

function applyPatch(payload) {
  const addedNodes = Array.isArray(payload?.addedNodes) ? payload.addedNodes : [];
  const updatedNodes = Array.isArray(payload?.updatedNodes) ? payload.updatedNodes : [];
  const removedNodeIds = Array.isArray(payload?.removedNodeIds) ? payload.removedNodeIds : [];
  const addedEdges = Array.isArray(payload?.addedEdges) ? payload.addedEdges : [];
  const removedEdges = Array.isArray(payload?.removedEdges) ? payload.removedEdges : [];

  for (const nodeId of removedNodeIds) {
    state.allNodeById.delete(nodeId);
  }

  for (const node of addedNodes) {
    state.allNodeById.set(node.id, { ...node });
  }

  for (const patchNode of updatedNodes) {
    const existingNode = state.allNodeById.get(patchNode.id);
    if (existingNode) {
      Object.assign(existingNode, patchNode);
    } else {
      state.allNodeById.set(patchNode.id, { ...patchNode });
    }
  }

  for (const edge of removedEdges) {
    const sourceId = String(edge.source);
    const targetId = String(edge.target);
    const edgeType = String(edge.type ?? '');
    const edgeLabel = String(edge.label ?? '');
    state.allEdgeByKey.delete(toEdgeKey(sourceId, targetId, edgeType, edgeLabel));
  }

  for (const edge of addedEdges) {
    const sourceId = String(edge.source);
    const targetId = String(edge.target);
    const edgeType = String(edge.type ?? '');
    const edgeLabel = String(edge.label ?? '');
    const key = toEdgeKey(sourceId, targetId, edgeType, edgeLabel);
    state.allEdgeByKey.set(key, { key, source: sourceId, target: targetId, type: edgeType, label: edgeLabel });
  }

  if (payload?.stats) {
    state.stats = payload.stats;
  }

  if (removedNodeIds.includes(state.selectedNodeId)) {
    state.selectedNodeId = null;
    renderEmptyDetails();
  }

  rebuildConnectionIndexes();
  populateFilters();
  applyFiltersAndRender({ shouldLazyLoad: false });
  syncHighlights();
  const selectedNode = state.selectedNodeId ? state.allNodeById.get(state.selectedNodeId) : null;
  if (selectedNode) {
    renderDetails(selectedNode);
  }
  updateStats();
}

function rebuildConnectionIndexes() {
  state.neighborsByNodeId = new Map();
  state.linksByNodeId = new Map();

  for (const node of state.allNodeById.values()) {
    state.neighborsByNodeId.set(node.id, new Set());
    state.linksByNodeId.set(node.id, new Set());
  }

  for (const edge of state.allEdgeByKey.values()) {
    state.neighborsByNodeId.get(edge.source)?.add(edge.target);
    state.neighborsByNodeId.get(edge.target)?.add(edge.source);
    state.linksByNodeId.get(edge.source)?.add(edge.key);
    state.linksByNodeId.get(edge.target)?.add(edge.key);
  }
}

function applyFiltersAndRender({ shouldLazyLoad }) {
  const filteredNodes = [];
  for (const node of state.allNodeById.values()) {
    if (isNodeVisible(node)) {
      filteredNodes.push(node);
    }
  }

  const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredLinks = [];
  for (const edge of state.allEdgeByKey.values()) {
    if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
      filteredLinks.push({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label,
        _key: edge.key
      });
    }
  }

  state.visibleNodeIds = visibleNodeIds;
  renderGraph(filteredNodes, filteredLinks, { shouldLazyLoad });
  updateStats();
}

function renderGraph(nodes, links, { shouldLazyLoad }) {
  void shouldLazyLoad;
  queueGraphDataUpdate(nodes, links);
}

function scheduleFilterApply() {
  if (state.filterDebounce) {
    clearTimeout(state.filterDebounce);
  }
  state.filterDebounce = setTimeout(() => {
    state.filterDebounce = null;
    applyFiltersAndRender({ shouldLazyLoad: false });
  }, FILTER_DEBOUNCE_MS);
}

function syncHighlights() {
  const nextHighlightedNodeIds = new Set();
  const nextHighlightedEdgeKeys = new Set();
  const focusNodeId = state.selectedNodeId ?? state.hoveredNodeId;
  if (!focusNodeId || !state.visibleNodeIds.has(focusNodeId)) {
    if (state.highlightedNodeIds.size === 0 && state.highlightedEdgeKeys.size === 0) {
      return;
    }
    state.highlightedNodeIds = nextHighlightedNodeIds;
    state.highlightedEdgeKeys = nextHighlightedEdgeKeys;
    graph.refresh();
    return;
  }

  nextHighlightedNodeIds.add(focusNodeId);
  for (const neighborNodeId of state.neighborsByNodeId.get(focusNodeId) ?? []) {
    if (state.visibleNodeIds.has(neighborNodeId)) {
      nextHighlightedNodeIds.add(neighborNodeId);
    }
  }
  for (const edgeKey of state.linksByNodeId.get(focusNodeId) ?? []) {
    nextHighlightedEdgeKeys.add(edgeKey);
  }
  if (
    areSetsEqual(state.highlightedNodeIds, nextHighlightedNodeIds) &&
    areSetsEqual(state.highlightedEdgeKeys, nextHighlightedEdgeKeys)
  ) {
    return;
  }
  state.highlightedNodeIds = nextHighlightedNodeIds;
  state.highlightedEdgeKeys = nextHighlightedEdgeKeys;
  graph.refresh();
}

function selectNode(node) {
  state.selectedNodeId = node.id;
  syncHighlights();
  renderDetails(node);
  focusNode(node, { zoom: state.tvMode ? 2.4 : 3.9, durationMs: 520 });
}

function focusNode(node, { zoom, durationMs }) {
  graph.centerAt(node.x ?? 0, node.y ?? 0, durationMs);
  graph.zoom(zoom, durationMs);
}

function renderEmptyDetails() {
  detailsElement.innerHTML = '<p>Select a node to inspect details and connections.</p>';
}

function renderDetails(node) {
  const neighbors = Array.from(state.neighborsByNodeId.get(node.id) ?? [])
    .map((neighborId) => state.allNodeById.get(neighborId))
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title));

  const tags = Array.isArray(node.tags) && node.tags.length > 0 ? node.tags.join(', ') : 'none';
  const category = node.category || 'default';
  const degree = Number(node.degree ?? neighbors.length);
  const pathValue = node.path ?? '(unresolved link target)';
  const nodeType = node.missing ? 'missing' : 'resolved';

  const connectionItems = neighbors.length
    ? neighbors
        .map((neighbor) => {
          const color = colorForCategory(neighbor.category);
          return `<li><a href="#" class="connection-link" data-node-id="${escapeHtml(neighbor.id)}" style="color:${color}">${escapeHtml(neighbor.title)}</a></li>`;
        })
        .join('')
    : '<li>No direct connections</li>';

  detailsElement.innerHTML = `
    <div class="meta-label">Title</div>
    <p class="meta-value">${escapeHtml(node.title)}</p>
    <div class="meta-label">ID</div>
    <p class="meta-value">${escapeHtml(node.id)}</p>
    <div class="meta-label">Category</div>
    <p class="meta-value">${escapeHtml(category)}</p>
    <div class="meta-label">Type</div>
    <p class="meta-value">${nodeType}</p>
    <div class="meta-label">Tags</div>
    <p class="meta-value">${escapeHtml(tags)}</p>
    <div class="meta-label">Degree</div>
    <p class="meta-value">${degree}</p>
    <div class="meta-label">Path</div>
    <p class="meta-value">${escapeHtml(pathValue)}</p>
    <div class="meta-label">Connections (${neighbors.length})</div>
    <ul class="connection-list">${connectionItems}</ul>
  `;
}

function updateStats() {
  const totalNodes = state.stats?.nodeCount ?? state.allNodeById.size;
  const totalLinks = state.stats?.edgeCount ?? state.allEdgeByKey.size;
  const totalFiles = state.stats?.fileCount ?? totalNodes;
  const visibleNodes = state.visibleNodeIds.size;
  const label = `${visibleNodes}/${totalNodes} nodes • ${totalLinks} links • ${totalFiles} files`;
  statsElement.textContent = state.wsVersion > 0 ? `${label} • live v${state.wsVersion}` : label;
}

function populateFilters() {
  const currentCategory = state.category;
  const currentTag = state.tag;

  const categories = new Set(['all']);
  const tags = new Set(['all']);
  for (const node of state.allNodeById.values()) {
    categories.add(node.category || 'default');
    for (const tag of Array.isArray(node.tags) ? node.tags : []) {
      if (tag) {
        tags.add(tag);
      }
    }
  }

  setSelectOptions(categoryFilterElement, Array.from(categories).sort(sortFilterOption), currentCategory, 'All categories');
  setSelectOptions(tagFilterElement, Array.from(tags).sort(sortFilterOption), currentTag, 'All tags');
}

function sortFilterOption(a, b) {
  if (a === 'all') return -1;
  if (b === 'all') return 1;
  return a.localeCompare(b);
}

function setSelectOptions(selectElement, values, currentValue, allLabel) {
  selectElement.innerHTML = values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value === 'all' ? allLabel : value)}</option>`)
    .join('');

  if (values.includes(currentValue)) {
    selectElement.value = currentValue;
  } else {
    selectElement.value = 'all';
    if (selectElement === categoryFilterElement) {
      state.category = 'all';
    } else if (selectElement === tagFilterElement) {
      state.tag = 'all';
    }
  }
}

function isNodeVisible(node) {
  const matchesCategory = state.category === 'all' || (node.category || 'default') === state.category;
  if (!matchesCategory) {
    return false;
  }

  const matchesTag = state.tag === 'all' || (Array.isArray(node.tags) && node.tags.includes(state.tag));
  if (!matchesTag) {
    return false;
  }

  const isMissing = Boolean(node.missing);
  if (state.nodeType === 'missing' && !isMissing) {
    return false;
  }
  if (state.nodeType === 'resolved' && isMissing) {
    return false;
  }

  if (!state.searchTerm) {
    return true;
  }

  const haystack = [node.id, node.title, node.category, Array.isArray(node.tags) ? node.tags.join(' ') : '']
    .join(' ')
    .toLowerCase();
  return haystack.includes(state.searchTerm);
}

function renderNode(node, ctx, globalScale) {
  void globalScale;
  const radius = getNodeRadius(node);
  const nodeId = node.id;
  const isFocused = state.selectedNodeId === nodeId || state.hoveredNodeId === nodeId;
  const isHighlighted = state.highlightedNodeIds.has(nodeId);
  const hasFocusContext = Boolean(state.selectedNodeId || state.hoveredNodeId);
  const baseColor = getNodeColor(node);
  const finalColor = hasFocusContext && !isHighlighted ? DIMMED_NODE_COLOR : baseColor;

  ctx.beginPath();
  ctx.arc(node.x, node.y, radius + (isFocused ? 1.2 : 0), 0, Math.PI * 2, false);
  ctx.fillStyle = finalColor;
  ctx.fill();
}

function getNodeRadius(node) {
  const degree = Number(node.degree ?? 0);
  return 2.7 + Math.min(7.6, Math.sqrt(degree + 1) * 1.08);
}

function getNodeColor(node) {
  if (node.missing) {
    return '#ffc58b';
  }
  if (state.highlightedNodeIds.has(node.id)) {
    return '#f3faff';
  }
  return colorForCategory(node.category);
}

function getLinkColor(link) {
  const key = linkKey(link);
  if (state.highlightedEdgeKeys.has(key)) {
    return HIGHLIGHT_LINK_COLOR;
  }
  if (state.selectedNodeId || state.hoveredNodeId) {
    return DIMMED_LINK_COLOR;
  }
  return NORMAL_LINK_COLOR;
}

function getLinkWidth(link) {
  const key = linkKey(link);
  if (state.highlightedEdgeKeys.has(key)) {
    return 2.1;
  }
  return 1;
}

function linkKey(link) {
  if (link?._key) {
    return link._key;
  }
  const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source);
  const targetId = typeof link.target === 'object' ? link.target.id : String(link.target);
  const edgeType = String(link.type ?? '');
  const edgeLabel = String(link.label ?? '');
  return toEdgeKey(sourceId, targetId, edgeType, edgeLabel);
}

function colorForCategory(category) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;
}

function startRealtime() {
  let reconnectDelayMs = 800;
  let socket = null;
  let reconnectTimer = null;

  const scheduleReconnect = () => {
    if (reconnectTimer) {
      return;
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelayMs);
    reconnectDelayMs = Math.min(10_000, Math.round(reconnectDelayMs * 1.8));
  };

  const connect = () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const activeSocket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    socket = activeSocket;
    setRealtimeStatus({ text: 'Realtime: connecting...', level: 'warn' });

    activeSocket.addEventListener('open', () => {
      if (socket !== activeSocket) {
        return;
      }
      reconnectDelayMs = 800;
      state.wsConnected = true;
      setRealtimeStatus({ text: 'Realtime: connected', level: 'ok' });
    });

    activeSocket.addEventListener('message', (event) => {
      if (socket !== activeSocket) {
        return;
      }
      const message = parseMessage(event.data);
      if (!message) {
        return;
      }
      if (message.type === 'graph:init') {
        const version = Number(message.payload?.version ?? 0);
        if (version >= state.wsVersion) {
          state.wsVersion = version;
          applySnapshot(message.payload?.graph ?? {}, { shouldLazyLoad: true, shouldFit: false });
          updateStats();
        }
        return;
      }
      if (message.type === 'graph:patch') {
        const version = Number(message.payload?.version ?? 0);
        if (version <= state.wsVersion) {
          return;
        }
        state.wsVersion = version;
        applyPatch(message.payload);
        setRealtimeStatus({ text: `Realtime: updated (${message.payload?.reason ?? 'patch'})`, level: 'ok' });
      }
    });

    activeSocket.addEventListener('error', () => {});

    activeSocket.addEventListener('close', () => {
      if (socket !== activeSocket) {
        return;
      }
      state.wsConnected = false;
      setRealtimeStatus({ text: 'Realtime: reconnecting...', level: 'warn' });
      socket = null;
      scheduleReconnect();
    });
  };

  connect();
}

function enableWebglRendererIfSupported() {
  const renderers = window.ForceGraph?.renderers;
  const webglRenderer = renderers?.webgl;
  if (typeof graph.graphRenderer === 'function' && webglRenderer) {
    graph.graphRenderer(webglRenderer);
  }
}

function parseMessage(value) {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function setRealtimeStatus({ text, level }) {
  realtimeStatusElement.textContent = text;
  realtimeStatusElement.classList.remove('ok', 'warn');
  if (level) {
    realtimeStatusElement.classList.add(level);
  }
}

function setTvMode(enabled, { updateQuery, useFullscreen }) {
  state.tvMode = enabled;
  document.body.classList.toggle('tv-mode', enabled);
  tvModeButtonElement.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  tvModeButtonElement.textContent = enabled ? 'Exit TV Mode' : 'TV Mode';
  resizeGraphToContainer();
  graph.refresh();

  if (updateQuery) {
    const url = new URL(window.location.href);
    if (enabled) {
      url.searchParams.set('tv', '1');
    } else {
      url.searchParams.delete('tv');
    }
    window.history.replaceState({}, '', url);
  }

  if (useFullscreen && enabled && document.fullscreenElement == null) {
    void document.documentElement.requestFullscreen().catch(() => {});
  }
  if (useFullscreen && !enabled && document.fullscreenElement != null) {
    void document.exitFullscreen().catch(() => {});
  }
}

function markInteraction() {
  state.lastInteractionAt = performance.now();
}

function queueGraphDataUpdate(nodes, links) {
  state.pendingGraphData = { nodes, links };
  const now = performance.now();
  const elapsedMs = now - state.lastGraphDataApplyAt;
  if (elapsedMs >= GRAPH_UPDATE_THROTTLE_MS && state.graphDataThrottleTimer == null) {
    applyPendingGraphData();
    return;
  }
  if (state.graphDataThrottleTimer != null) {
    return;
  }
  const delayMs = Math.max(0, GRAPH_UPDATE_THROTTLE_MS - elapsedMs);
  state.graphDataThrottleTimer = setTimeout(() => {
    state.graphDataThrottleTimer = null;
    applyPendingGraphData();
  }, delayMs);
}

function applyPendingGraphData() {
  if (!state.pendingGraphData) {
    return;
  }
  const { nodes, links } = state.pendingGraphData;
  state.pendingGraphData = null;
  state.lastGraphDataApplyAt = performance.now();
  graph.graphData({ nodes, links });
  graph.d3ReheatSimulation();
  syncHighlights();
}

function areSetsEqual(left, right) {
  if (left.size !== right.size) {
    return false;
  }
  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }
  return true;
}

function toEdgeKey(sourceId, targetId, edgeType = '', edgeLabel = '') {
  return `${sourceId}=>${targetId}:${edgeType}:${edgeLabel}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
