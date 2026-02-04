export interface RunCardParams {
  cardId: string;
  prompt?: string;
  model?: string;
}

export interface RunCardResponse {
  success: boolean;
  cardId: string;
  status: "started";
  projectPath: string;
  prompt: string;
}

export interface RunStatusResponse {
  status: "running" | "completed" | "error" | "not_found";
  messageCount: number;
  messages: any[];
  error?: string;
}

/**
 * Starts running an agent on a card
 */
export async function runCard(params: RunCardParams): Promise<RunCardResponse> {
  if (typeof window === "undefined") {
    throw new Error("Cannot run card on server side");
  }
  
  try {
    const response = await fetch("/api/run-card", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cardId: params.cardId,
        prompt: params.prompt,
        model: params.model,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(errorData.error || "Failed to start card processing");
    }

    return await response.json();
  } catch (error) {
    console.error("Error starting card run:", error);
    throw error;
  }
}

/**
 * Gets the status of a running card execution
 */
export async function getRunStatus(cardId: string): Promise<RunStatusResponse> {
  if (typeof window === "undefined") {
    throw new Error("Cannot get run status on server side");
  }
  
  try {
    const url = `/api/run-card?cardId=${encodeURIComponent(cardId)}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(errorData.error || "Failed to get run status");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting run status:", error);
    throw error;
  }
}

/**
 * Cancels a running card execution
 */
export async function cancelRun(cardId: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Cannot cancel run on server side");
  }
  
  try {
    const response = await fetch("/api/run-card", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cardId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(errorData.error || "Failed to cancel run");
    }
  } catch (error) {
    console.error("Error cancelling run:", error);
    throw error;
  }
}
