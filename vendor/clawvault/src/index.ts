/**
 * ClawVault 🐘 — An Elephant Never Forgets
 * 
 * Structured memory system for AI agents with Obsidian-compatible markdown
 * and embedded semantic search.
 * 
 * @example
 * ```typescript
 * import { ClawVault, createVault, findVault } from 'clawvault';
 * 
 * // Create a new vault
 * const vault = await createVault('./my-memory');
 * 
 * // Store a memory
 * await vault.store({
 *   category: 'decisions',
 *   title: 'Use ClawVault',
 *   content: 'Decided to use ClawVault for memory management.'
 * });
 * 
 * // Search memories
 * const results = await vault.find('memory management');
 * console.log(results);
 * ```
 */

import * as fs from 'fs';
import type { Command } from 'commander';
import { registerCliCommands } from './cli/index.js';

// Core exports
export { ClawVault, createVault, findVault } from './lib/vault.js';
export { setupCommand } from './commands/setup.js';
export { compatCommand, checkOpenClawCompatibility, compatibilityExitCode } from './commands/compat.js';
export type { CompatCheck, CompatReport, CompatStatus, CompatCommandOptions } from './commands/compat.js';
export { graphCommand, graphSummary } from './commands/graph.js';
export type { GraphSummary } from './commands/graph.js';
export {
  kanbanCommand,
  syncKanbanBoard,
  importKanbanBoard,
  buildKanbanLanes,
  generateKanbanMarkdown,
  parseKanbanMarkdown,
  formatKanbanCard,
  extractCardSlug
} from './commands/kanban.js';
export type {
  KanbanGroupBy,
  KanbanSyncOptions,
  KanbanImportOptions,
  KanbanLane,
  KanbanSyncResult,
  KanbanImportChange,
  KanbanImportResult,
  ParsedKanbanLane,
  ParsedKanbanBoard
} from './commands/kanban.js';
export {
  contextCommand,
  buildContext,
  formatContextMarkdown,
  registerContextCommand
} from './commands/context.js';
export type { ContextFormat, ContextProfile, ContextProfileOption, ContextOptions, ContextEntry, ContextResult } from './commands/context.js';
export {
  injectCommand,
  buildInjectionResult,
  registerInjectCommand
} from './commands/inject.js';
export type { InjectFormat, InjectCommandOptions } from './commands/inject.js';
export { observeCommand, registerObserveCommand } from './commands/observe.js';
export type { ObserveCommandOptions } from './commands/observe.js';
export { reflectCommand, registerReflectCommand } from './commands/reflect.js';
export type { ReflectCommandOptions } from './commands/reflect.js';
export { archiveCommand, registerArchiveCommand } from './commands/archive.js';
export type { ArchiveCommandOptions } from './commands/archive.js';
export { rebuildCommand, registerRebuildCommand } from './commands/rebuild.js';
export type { RebuildCommandOptions } from './commands/rebuild.js';
export {
  doctor,
} from './commands/doctor.js';
export type {
  DoctorCheck,
  DoctorReport,
  DoctorStatus
} from './commands/doctor.js';
export { embedCommand, registerEmbedCommand } from './commands/embed.js';
export type { EmbedCommandOptions, EmbedCommandResult } from './commands/embed.js';
export { replayCommand, registerReplayCommand } from './commands/replay.js';
export type { ReplayCommandOptions } from './commands/replay.js';
export {
  migrateObservations,
  migrateObservationsCommand,
  registerMigrateObservationsCommand
} from './commands/migrate-observations.js';
export type { MigrateObservationsOptions, MigrateObservationsResult } from './commands/migrate-observations.js';
export { syncBdCommand, registerSyncBdCommand } from './commands/sync-bd.js';
export type { SyncBdCommandOptions } from './commands/sync-bd.js';
export {
  sessionRecapCommand,
  buildSessionRecap,
  formatSessionRecapMarkdown
} from './commands/session-recap.js';
export type {
  SessionRecapFormat,
  SessionRecapOptions,
  SessionTurn,
  SessionRecapResult
} from './commands/session-recap.js';
export {
  SearchEngine,
  extractWikiLinks,
  extractTags,
  hasQmd,
  qmdUpdate,
  qmdEmbed,
  QmdUnavailableError,
  QMD_INSTALL_COMMAND,
  QMD_INSTALL_URL
} from './lib/search.js';
export { getVaultPath, findNearestVaultPath, resolveVaultPath } from './lib/config.js';
export { registerCliCommands } from './cli/index.js';
export {
  SUPPORTED_CONFIG_KEYS,
  getConfig,
  listConfig,
  getConfigValue,
  setConfigValue,
  resetConfig,
  listRouteRules,
  addRouteRule,
  removeRouteRule,
  matchRouteRule,
  testRouteRule
} from './lib/config-manager.js';
export type {
  ManagedConfigKey,
  RouteRule,
  ObserveProvider,
  ObserverCompressionProvider,
  Theme,
  ContextProfile as ConfigDefaultProfile
} from './lib/config-manager.js';
export {
  MEMORY_GRAPH_SCHEMA_VERSION,
  buildOrUpdateMemoryGraphIndex,
  getMemoryGraph,
  loadMemoryGraphIndex
} from './lib/memory-graph.js';
export {
  inferContextProfile,
  normalizeContextProfileInput,
  resolveContextProfile
} from './lib/context-profile.js';
export type { ContextProfileInput, ResolvedContextProfile } from './lib/context-profile.js';
export {
  indexInjectableItems,
  deterministicInjectMatches,
  runPromptInjection
} from './lib/inject-utils.js';
export type {
  InjectableItem,
  InjectMatchSource,
  InjectMatchReason,
  InjectMatch,
  InjectResult,
  InjectRuntimeOptions,
  InjectSourceCategory
} from './lib/inject-utils.js';
export { resolveLlmProvider, requestLlmCompletion } from './lib/llm-provider.js';
export type { LlmProvider, LlmCompletionOptions } from './lib/llm-provider.js';
export type {
  MemoryGraph,
  MemoryGraphNode,
  MemoryGraphEdge,
  MemoryGraphEdgeType,
  MemoryGraphNodeType,
  MemoryGraphIndex,
  MemoryGraphStats
} from './lib/memory-graph.js';
// Transition ledger exports
export {
  appendTransition,
  buildTransitionEvent,
  readAllTransitions,
  queryTransitions,
  countBlockedTransitions,
  isRegression,
  formatTransitionsTable,
} from './lib/transition-ledger.js';
export type { TransitionEvent } from './lib/transition-ledger.js';

export { Observer } from './observer/observer.js';
export type { ObserverOptions, ObserverCompressor, ObserverReflector } from './observer/observer.js';
export {
  observeActiveSessions,
  getScaledObservationThresholdBytes,
  parseSessionSourceLabel,
  getObserverStaleness
} from './observer/active-session-observer.js';
export type {
  ActiveObserveOptions,
  ActiveObserveResult,
  ActiveObservationCandidate,
  ActiveObservationFailure,
  ObserveCursorEntry,
  ObserveCursorStore,
  ObserverStalenessResult
} from './observer/active-session-observer.js';
export { Compressor } from './observer/compressor.js';
export type { CompressorOptions, CompressionProvider } from './observer/compressor.js';
export { Reflector } from './observer/reflector.js';
export type { ReflectorOptions } from './observer/reflector.js';
export { SessionWatcher } from './observer/watcher.js';
export type { SessionWatcherOptions } from './observer/watcher.js';
export { parseSessionFile } from './observer/session-parser.js';
export { runReflection } from './observer/reflection-service.js';
export type { ReflectOptions, ReflectResult } from './observer/reflection-service.js';
export { archiveObservations } from './observer/archive.js';
export type { ArchiveObservationsOptions, ArchiveObservationsResult } from './observer/archive.js';

// Tailscale networking exports
export {
  hasTailscale,
  getTailscaleVersion,
  getTailscaleStatus,
  findPeer,
  getOnlinePeers,
  resolvePeerIP,
  generateVaultManifest,
  compareManifests,
  serveVault,
  fetchRemoteManifest,
  fetchRemoteFile,
  pushFileToRemote,
  syncWithPeer,
  configureTailscaleServe,
  stopTailscaleServe,
  checkPeerClawVault,
  discoverClawVaultPeers,
  DEFAULT_SERVE_PORT,
  CLAWVAULT_SERVE_PATH
} from './lib/tailscale.js';
export type {
  TailscaleStatus,
  TailscalePeer,
  TailscaleServeConfig,
  TailscaleSyncOptions,
  TailscaleSyncResult,
  VaultManifest,
  VaultFileEntry,
  ServeInstance
} from './lib/tailscale.js';
export {
  tailscaleStatusCommand,
  tailscaleSyncCommand,
  tailscaleServeCommand,
  tailscaleDiscoverCommand,
  registerTailscaleCommands,
  registerTailscaleStatusCommand,
  registerTailscaleSyncCommand,
  registerTailscaleServeCommand,
  registerTailscaleDiscoverCommand
} from './commands/tailscale.js';
export type {
  TailscaleStatusCommandOptions,
  TailscaleSyncCommandOptions,
  TailscaleServeCommandOptions,
  TailscaleDiscoverCommandOptions
} from './commands/tailscale.js';

export {
  renderTemplate,
  buildTemplateVariables
} from './lib/template-engine.js';
export type { TemplateVariables } from './lib/template-engine.js';
export {
  updateTask,
  completeTask,
  listSubtasks,
  listDependentTasks
} from './lib/task-utils.js';
export {
  listProjects,
  readProject,
  createProject,
  updateProject,
  archiveProject,
  getProjectTasks,
  getProjectActivity
} from './lib/project-utils.js';
export type { ProjectStatus, ProjectFrontmatter, Project } from './lib/project-utils.js';

// Type exports
export type {
  VaultConfig,
  VaultMeta,
  Document,
  SearchResult,
  SearchOptions,
  StoreOptions,
  SyncOptions,
  SyncResult,
  Category,
  MemoryType,
  HandoffDocument,
  SessionRecap
} from './types.js';

export { DEFAULT_CATEGORIES, DEFAULT_CONFIG, MEMORY_TYPES, TYPE_TO_CATEGORY } from './types.js';

// Version
function readPackageVersion(): string {
  try {
    const pkgUrl = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(fs.readFileSync(pkgUrl, 'utf-8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const VERSION = readPackageVersion();

export function registerCommanderCommands(program: Command): Command {
  return registerCliCommands(program);
}
