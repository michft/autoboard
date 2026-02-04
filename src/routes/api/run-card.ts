import { APIEvent } from "@solidjs/start/server";
import { db } from "~/db";
import { kanbanCards, projects } from "~/db/schema";
import { eq } from "drizzle-orm";
import { runAgent, type AgentMessage } from "~/services/agent-service";

/** Active agent runs, keyed by cardId */
const activeRuns = new Map<
  string,
  {
    abortController: AbortController;
    messages: AgentMessage[];
    status: "running" | "completed" | "error";
    error?: string;
  }
>();

/**
 * POST /api/run-card
 *
 * Kicks off the Claude agent to work on a kanban card.
 *
 * Request body:
 * - cardId: string (required) - The ID of the card to run
 * - prompt?: string (optional) - Override the card description as the prompt
 * - model?: string (optional) - Model to use (default: claude-sonnet-4-20250514)
 *
 * Returns:
 * - 200: { success: true, cardId, status: "started" }
 * - 400: { error: "..." } for validation errors
 * - 404: { error: "..." } if card or project not found
 * - 500: { error: "..." } for server errors
 */
export async function POST({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { cardId, prompt: overridePrompt, model } = body;

    if (!cardId) {
      return Response.json({ error: "cardId is required" }, { status: 400 });
    }

    // Check if already running
    const existingRun = activeRuns.get(cardId);
    if (existingRun?.status === "running") {
      return Response.json(
        { error: "Card is already being processed" },
        { status: 400 }
      );
    }

    // Fetch the card
    const card = await db
      .select()
      .from(kanbanCards)
      .where(eq(kanbanCards.id, cardId))
      .limit(1);

    if (card.length === 0) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }

    const kanbanCard = card[0];

    if (!kanbanCard.projectId) {
      return Response.json(
        { error: "Card has no associated project" },
        { status: 400 }
      );
    }

    // Fetch the project to get the file path
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, kanbanCard.projectId))
      .limit(1);

    if (project.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const projectPath = project[0].filePath;
    const prompt = overridePrompt || kanbanCard.description || kanbanCard.title;

    // Create abort controller for this run
    const abortController = new AbortController();

    // Initialize run state
    activeRuns.set(cardId, {
      abortController,
      messages: [],
      status: "running",
    });

    // Start the agent in background (don't await)
    runAgentInBackground(cardId, prompt, projectPath, model, abortController);

    return Response.json({
      success: true,
      cardId,
      status: "started",
      projectPath,
      prompt,
    });
  } catch (error) {
    console.error("Error starting card run:", error);
    return Response.json(
      { error: "Failed to start card processing" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/run-card?cardId=<id>
 *
 * Get the status and messages for an active or completed run.
 */
export async function GET({ request }: APIEvent) {
  try {
    const url = new URL(request.url);
    const cardId = url.searchParams.get("cardId");

    if (!cardId) {
      return Response.json({ error: "cardId is required" }, { status: 400 });
    }

    const run = activeRuns.get(cardId);

    if (!run) {
      return Response.json({ status: "not_found" });
    }

    return Response.json({
      status: run.status,
      messageCount: run.messages.length,
      messages: run.messages,
      error: run.error,
    });
  } catch (error) {
    console.error("Error getting run status:", error);
    return Response.json(
      { error: "Failed to get run status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/run-card
 *
 * Cancel an active run.
 */
export async function DELETE({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { cardId } = body;

    if (!cardId) {
      return Response.json({ error: "cardId is required" }, { status: 400 });
    }

    const run = activeRuns.get(cardId);

    if (!run) {
      return Response.json({ error: "No active run found" }, { status: 404 });
    }

    if (run.status === "running") {
      run.abortController.abort();
      run.status = "error";
      run.error = "Cancelled by user";
    }

    return Response.json({ success: true, status: run.status });
  } catch (error) {
    console.error("Error cancelling run:", error);
    return Response.json({ error: "Failed to cancel run" }, { status: 500 });
  }
}

/**
 * Run the agent in background and collect messages.
 */
async function runAgentInBackground(
  cardId: string,
  prompt: string,
  cwd: string,
  model: string | undefined,
  abortController: AbortController
) {
  const run = activeRuns.get(cardId);
  if (!run) return;

  try {
    for await (const msg of runAgent({
      prompt,
      cwd,
      model,
      abortController,
    })) {
      run.messages.push(msg);

      // Log progress
      if (msg.type === "assistant" && msg.message?.content) {
        const textBlocks = msg.message.content.filter(
          (b: { type: string }) => b.type === "text"
        );
        if (textBlocks.length > 0) {
          console.log(`[Card ${cardId}] Agent response received`);
        }
      }
    }

    run.status = "completed";
    console.log(`[Card ${cardId}] Agent run completed`);
  } catch (error) {
    run.status = "error";
    run.error = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Card ${cardId}] Agent run failed:`, error);
  }
}
