import type { AgentMessage } from "./agent-service";

/**
 * State for an active or completed card run.
 */
export interface CardRunState {
  abortController: AbortController;
  messages: AgentMessage[];
  status: "running" | "completed" | "error";
  error?: string;
}

/**
 * Service to manage in-memory state for active card runs.
 * This manages the lifecycle of card execution runs.
 */
class CardRunStateService {
  /** Active agent runs, keyed by cardId */
  private activeRuns = new Map<string, CardRunState>();

  /**
   * Get the run state for a card.
   */
  getRun(cardId: string): CardRunState | undefined {
    return this.activeRuns.get(cardId);
  }

  /**
   * Check if a card is currently running.
   */
  isRunning(cardId: string): boolean {
    const run = this.activeRuns.get(cardId);
    return run?.status === "running";
  }

  /**
   * Create a new run state for a card.
   */
  createRun(cardId: string, abortController: AbortController): void {
    this.activeRuns.set(cardId, {
      abortController,
      messages: [],
      status: "running",
    });
  }

  /**
   * Update the status of a run.
   */
  updateRunStatus(cardId: string, status: "running" | "completed" | "error", error?: string): void {
    const run = this.activeRuns.get(cardId);
    if (run) {
      run.status = status;
      if (error) {
        run.error = error;
      }
    }
  }

  /**
   * Add a message to a run's message list.
   */
  addMessage(cardId: string, message: AgentMessage): void {
    const run = this.activeRuns.get(cardId);
    if (run) {
      run.messages.push(message);
    }
  }

  /**
   * Cancel a running card execution.
   */
  cancelRun(cardId: string): void {
    const run = this.activeRuns.get(cardId);
    if (run && run.status === "running") {
      run.abortController.abort();
      run.status = "error";
      run.error = "Cancelled by user";
    }
  }

  /**
   * Remove a run from memory (cleanup).
   */
  removeRun(cardId: string): void {
    this.activeRuns.delete(cardId);
  }
}

/**
 * Singleton instance of CardRunStateService.
 */
export const cardRunStateService = new CardRunStateService();
