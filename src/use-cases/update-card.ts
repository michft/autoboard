import type { Card, UpdateCardData } from "~/db/types";
import type { CardRepository } from "~/db/repositories/card-repository";
import { ValidationError, NotFoundError } from "./errors";

export interface UpdateCardInput {
  id: string;
  columnId?: string;
  title?: string;
  description?: string;
}

export interface UpdateCardResult {
  card: Card;
}

export class UpdateCardUseCase {
  constructor(private cardRepository: CardRepository) {}

  async execute(input: UpdateCardInput): Promise<UpdateCardResult> {
    if (!input.id) {
      throw new ValidationError("Card ID is required");
    }

    const updateData: UpdateCardData = {
      updatedAt: new Date(),
    };

    if (input.columnId !== undefined) updateData.columnId = input.columnId;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;

    try {
      const card = await this.cardRepository.updateCard(input.id, updateData);
      return { card };
    } catch (error) {
      if (error instanceof Error && error.message === "Card not found") {
        throw new NotFoundError("Card not found");
      }
      throw error;
    }
  }
}
