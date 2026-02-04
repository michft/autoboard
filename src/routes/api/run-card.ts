import { APIEvent } from "@solidjs/start/server";
import { cardRepository, projectRepository } from "~/db/repositories";
import {
  StartCardRunUseCase,
  GetCardRunStatusUseCase,
  CancelCardRunUseCase,
} from "~/use-cases";
import { ValidationError, NotFoundError, ConflictError } from "~/use-cases/errors";

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

    const useCase = new StartCardRunUseCase(cardRepository, projectRepository);
    const result = await useCase.execute({
      cardId,
      prompt: overridePrompt,
      model,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ConflictError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
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

    const useCase = new GetCardRunStatusUseCase();
    const result = await useCase.execute({
      cardId: cardId || "",
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
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

    const useCase = new CancelCardRunUseCase();
    const result = await useCase.execute({ cardId });

    return Response.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    console.error("Error cancelling run:", error);
    return Response.json({ error: "Failed to cancel run" }, { status: 500 });
  }
}
