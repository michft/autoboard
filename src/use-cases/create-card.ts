import { randomUUID } from "node:crypto";
import type { Card, CreateCardData } from "~/db/types";
import type { CardRepository } from "~/db/repositories/card-repository";
import { ValidationError } from "./errors";

export interface CreateCardInput {
  title?: string;
  description?: string;
  columnId: string;
  projectId: string;
}

export interface CreateCardResult {
  card: Card;
}

export class CreateCardUseCase {
  constructor(private cardRepository: CardRepository) {}

  async execute(input: CreateCardInput): Promise<CreateCardResult> {
    // Validation
    if (!input.columnId || !input.projectId) {
      throw new ValidationError("ColumnId and projectId are required");
    }

    if (!input.description && !input.title) {
      throw new ValidationError("Either title or description is required");
    }

    // Generate ID and timestamps
    const id = randomUUID();
    const now = new Date();

    const cardData: CreateCardData = {
      id,
      title: input.title || null,
      description: input.description || null,
      columnId: input.columnId,
      projectId: input.projectId,
      createdAt: now,
      updatedAt: now,
    };

    const card = await this.cardRepository.createCard(cardData);

    return { card };
  }
}
