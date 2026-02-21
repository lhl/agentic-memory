/**
 * ClawVault Types - The elephant's memory structure
 */

export interface VaultConfig {
  /** Root path of the vault */
  path: string;
  /** Name of the vault */
  name: string;
  /** Categories to create on init */
  categories: string[];
  /** qmd collection name (defaults to vault name if not set) */
  qmdCollection?: string;
  /** Root path for qmd collection (defaults to vault path) */
  qmdRoot?: string;
  /** Custom templates path (optional) */
  templatesPath?: string;
}

export interface VaultMeta {
  name: string;
  version: string;
  created: string;
  lastUpdated: string;
  categories: string[];
  documentCount: number;
  /** qmd collection name (defaults to vault name if not set) */
  qmdCollection?: string;
  /** Root path for qmd collection (defaults to vault path) */
  qmdRoot?: string;
}

export interface Document {
  /** Unique ID (relative path without extension) */
  id: string;
  /** Full file path */
  path: string;
  /** Category (folder name) */
  category: string;
  /** Document title */
  title: string;
  /** Raw content */
  content: string;
  /** Frontmatter metadata */
  frontmatter: Record<string, unknown>;
  /** Extracted wiki-links [[like-this]] */
  links: string[];
  /** Tags extracted from content */
  tags: string[];
  /** Last modified timestamp */
  modified: Date;
}

export interface SearchResult {
  /** Document that matched */
  document: Document;
  /** Relevance score (0-1) */
  score: number;
  /** Matching snippet */
  snippet: string;
  /** Which terms matched */
  matchedTerms: string[];
}

export interface SearchOptions {
  /** Max results to return */
  limit?: number;
  /** Minimum score threshold (0-1) */
  minScore?: number;
  /** Filter by category */
  category?: string;
  /** Filter by tags */
  tags?: string[];
  /** Include full content in results */
  fullContent?: boolean;
  /** Boost recent documents in ranking */
  temporalBoost?: boolean;
}

export interface StoreOptions {
  /** Category to store in */
  category: string;
  /** Document title (used for filename) */
  title: string;
  /** Content body */
  content: string;
  /** Frontmatter metadata */
  frontmatter?: Record<string, unknown>;
  /** Override existing file */
  overwrite?: boolean;
  /** Trigger qmd update after storing */
  qmdUpdate?: boolean;
  /** Trigger qmd embed after storing (implies qmdUpdate) */
  qmdEmbed?: boolean;
  /** Optional qmd index name override (defaults to configured/global index) */
  qmdIndexName?: string;
}

export interface SyncOptions {
  /** Target directory to sync to */
  target: string;
  /** Delete files in target not in source */
  deleteOrphans?: boolean;
  /** Dry run - don't actually sync */
  dryRun?: boolean;
}

export interface SyncResult {
  copied: string[];
  deleted: string[];
  unchanged: string[];
  errors: string[];
}

export type Category = 
  | 'preferences'
  | 'decisions'
  | 'rules'
  | 'patterns'
  | 'people'
  | 'projects'
  | 'goals'
  | 'transcripts'
  | 'inbox'
  | 'templates'
  | 'facts'
  | 'feelings'
  | 'lessons'
  | 'commitments'
  | 'handoffs'
  | string;

export const DEFAULT_CATEGORIES: Category[] = [
  'rules',
  'preferences',
  'decisions',
  'patterns',
  'people',
  'projects',
  'goals',
  'transcripts',
  'inbox',
  'templates',
  'lessons',
  'agents',
  'commitments',
  'handoffs',
  'research',
  'tasks',
  'backlog'
];

/**
 * Memory Type Taxonomy (Benthic's 8 categories)
 * Knowing WHAT KIND of thing helps you know WHERE to put it
 */
export type MemoryType = 
  | 'fact'        // Raw information, data points
  | 'feeling'     // Emotional states, reactions, moods
  | 'decision'    // Choices made with reasoning
  | 'lesson'      // What I learned, insights, patterns
  | 'commitment'  // Promises, goals, obligations
  | 'preference'  // Likes, dislikes, how I want things
  | 'relationship'// People, connections, dynamics
  | 'project';    // Active work, ventures, ongoing efforts

export const MEMORY_TYPES: MemoryType[] = [
  'fact', 'feeling', 'decision', 'lesson', 
  'commitment', 'preference', 'relationship', 'project'
];

/**
 * Memory type to category mapping
 */
export const TYPE_TO_CATEGORY: Record<MemoryType, Category> = {
  fact: 'facts',
  feeling: 'feelings',
  decision: 'decisions',
  lesson: 'lessons',
  commitment: 'commitments',
  preference: 'preferences',
  relationship: 'people',
  project: 'projects'
};

/**
 * Handoff document - bridges sessions
 */
export interface HandoffDocument {
  /** When this handoff was created */
  created: string;
  /** Session key or identifier */
  sessionKey?: string;
  /** What I was working on */
  workingOn: string[];
  /** What is currently blocked */
  blocked: string[];
  /** What comes next */
  nextSteps: string[];
  /** Emotional state/energy */
  feeling?: string;
  /** Key decisions made */
  decisions?: string[];
  /** Open questions */
  openQuestions?: string[];
}

/**
 * Session recap - who I was when I woke up
 */
export interface SessionRecap {
  /** When recap was generated */
  generated: string;
  /** Recent handoffs (last N) */
  recentHandoffs: HandoffDocument[];
  /** Active projects */
  activeProjects: string[];
  /** Pending commitments */
  pendingCommitments: string[];
  /** Recent decisions made */
  recentDecisions?: string[];
  /** Recent lessons learned */
  recentLessons: string[];
  /** Key relationships to remember */
  keyRelationships: string[];
  /** Current emotional arc */
  emotionalArc?: string;
}

export const DEFAULT_CONFIG: Partial<VaultConfig> = {
  categories: DEFAULT_CATEGORIES
};
