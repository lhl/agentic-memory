export type ReplaySource = 'chatgpt' | 'claude' | 'opencode' | 'openclaw';

export interface NormalizedReplayMessage {
  source: ReplaySource;
  conversationId?: string;
  role?: string;
  text: string;
  timestamp?: string;
}
