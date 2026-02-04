/**
 * Interface for Claude code query functionality.
 * Abstracts the communication with Claude's code query function.
 */

/**
 * Content block within a Claude message.
 */
export interface ClaudeMessageContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Message structure from Claude query stream.
 */
export interface ClaudeMessage {
  type: string;
  subtype?: string;
  message?: {
    content?: ClaudeMessageContentBlock[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Options for querying Claude.
 */
export interface ClaudeQueryOptions {
  /** The prompt/task for Claude to execute */
  prompt: string;
  /** Model to use (e.g., "claude-haiku-4-5", "claude-sonnet-4-20250514") */
  model: string;
  /** Working directory (project path) for the query */
  cwd: string;
  /** Maximum number of turns before stopping */
  maxTurns?: number;
  /** List of allowed tools (empty array for no tools) */
  allowedTools?: string[];
  /** Permission mode for the SDK */
  permissionMode?: string;
  /** Whether to allow dangerously skipping permissions */
  allowDangerouslySkipPermissions?: boolean;
  /** Environment variables to pass to the SDK */
  env?: Record<string, string | undefined>;
  /** Optional system prompt */
  systemPrompt?: string;
  /** Optional abort controller for cancellation */
  abortController?: AbortController;
}

/**
 * Interface for Claude code query provider.
 * Implementations handle all SDK-specific details internally.
 */
export interface IClaudeCodeQuery {
  /**
   * Execute a query against Claude's code query function.
   *
   * @param options - Configuration options for the query
   * @returns AsyncGenerator that yields Claude messages from the stream
   */
  query(options: ClaudeQueryOptions): AsyncGenerator<ClaudeMessage>;
}
