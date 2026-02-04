/**
 * Agent Service - Minimal wrapper for Claude Agent SDK
 *
 * Kicks off prompts using the Anthropic Agent SDK to work on a project.
 */

import { query, type Options } from "@anthropic-ai/claude-agent-sdk";

/** Tool presets for agent execution */
const TOOL_PRESETS = {
  fullAccess: [
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "Bash",
    "WebSearch",
    "WebFetch",
  ] as const,
};

/**
 * System environment variables to pass to the SDK.
 */
const SYSTEM_ENV_VARS = [
  "PATH",
  "HOME",
  "SHELL",
  "TERM",
  "USER",
  "LANG",
  "LC_ALL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
];

/**
 * Build environment object for the SDK from process.env.
 */
function buildEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const key of SYSTEM_ENV_VARS) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }
  return env;
}

/** Options for running the agent */
export interface RunAgentOptions {
  /** The prompt/task for the agent to execute */
  prompt: string;
  /** Working directory (project path) for the agent */
  cwd: string;
  /** Optional model override (defaults to opus) */
  model?: string;
  /** Optional system prompt */
  systemPrompt?: string;
  /** Optional abort controller for cancellation */
  abortController?: AbortController;
  /** Max turns before stopping (default: 500) */
  maxTurns?: number;
}

/** Message from the agent stream */
export interface AgentMessage {
  type: string;
  subtype?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Run the Claude agent with the given prompt on a project.
 *
 * @param options - Configuration for the agent run
 * @returns AsyncGenerator that yields agent messages
 */
export async function* runAgent(
  options: RunAgentOptions
): AsyncGenerator<AgentMessage> {
  const {
    prompt,
    cwd,
    model = "claude-sonnet-4-20250514",
    systemPrompt,
    abortController,
    maxTurns = 500,
  } = options;

  const sdkOptions: Options = {
    model,
    cwd,
    maxTurns,
    allowedTools: [...TOOL_PRESETS.fullAccess],
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    // Pass system environment variables so SDK can spawn processes
    env: buildEnv(),
    ...(systemPrompt && { systemPrompt }),
    ...(abortController && { abortController }),
  };

  const stream = query({ prompt, options: sdkOptions });

  for await (const msg of stream) {
    yield msg as AgentMessage;
  }
}

/**
 * Run agent and collect all messages (non-streaming).
 *
 * @param options - Configuration for the agent run
 * @returns Array of all agent messages
 */
export async function runAgentToCompletion(
  options: RunAgentOptions
): Promise<AgentMessage[]> {
  const messages: AgentMessage[] = [];

  for await (const msg of runAgent(options)) {
    messages.push(msg);
  }

  return messages;
}
