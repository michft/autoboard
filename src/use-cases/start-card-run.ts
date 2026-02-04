import type { CardRepository } from "~/db/repositories/card-repository";
import type { ProjectRepository } from "~/db/repositories/project-repository";
import { cardRunStateService } from "~/services/card-run-state";
import { runAgent, type AgentMessage } from "~/services/agent-service";
import { ValidationError, NotFoundError, ConflictError } from "./errors";

export interface StartCardRunInput {
  cardId: string;
  prompt?: string;
  model?: string;
}

export interface StartCardRunResult {
  success: boolean;
  cardId: string;
  status: "started";
  projectPath: string;
  prompt: string;
}

export class StartCardRunUseCase {
  constructor(
    private cardRepository: CardRepository,
    private projectRepository: ProjectRepository
  ) {}

  async execute(input: StartCardRunInput): Promise<StartCardRunResult> {
    if (!input.cardId) {
      throw new ValidationError("cardId is required");
    }

    // Check if already running
    if (cardRunStateService.isRunning(input.cardId)) {
      throw new ConflictError("Card is already being processed");
    }

    // Fetch the card
    const kanbanCard = await this.cardRepository.getCardById(input.cardId);

    if (!kanbanCard) {
      throw new NotFoundError("Card not found");
    }

    if (!kanbanCard.projectId) {
      throw new ValidationError("Card has no associated project");
    }

    // Fetch the project to get the file path
    const project = await this.projectRepository.getProjectById(kanbanCard.projectId);

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const projectPath = project.filePath;
    const prompt = input.prompt || kanbanCard.description || kanbanCard.title || "";

    if (!prompt) {
      throw new ValidationError("Card must have a prompt, description, or title");
    }

    // Create abort controller for this run
    const abortController = new AbortController();

    // Initialize run state
    cardRunStateService.createRun(input.cardId, abortController);

    // Start the agent in background (don't await)
    this.runAgentInBackground(input.cardId, prompt, projectPath, input.model, abortController);

    return {
      success: true,
      cardId: input.cardId,
      status: "started",
      projectPath,
      prompt,
    };
  }

  /**
   * Run the agent in background and collect messages.
   */
  private async runAgentInBackground(
    cardId: string,
    prompt: string,
    cwd: string,
    model: string | undefined,
    abortController: AbortController
  ): Promise<void> {
    const run = cardRunStateService.getRun(cardId);
    if (!run) return;

    try {
      for await (const msg of runAgent({
        prompt,
        cwd,
        model,
        abortController,
      })) {
        cardRunStateService.addMessage(cardId, msg);

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

      cardRunStateService.updateRunStatus(cardId, "completed");
      console.log(`[Card ${cardId}] Agent run completed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      cardRunStateService.updateRunStatus(cardId, "error", errorMessage);
      console.error(`[Card ${cardId}] Agent run failed:`, error);
    }
  }
}
