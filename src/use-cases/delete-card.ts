import type { CardRepository } from "~/db/repositories/card-repository";
import { ValidationError } from "./errors";

export interface DeleteCardInput {
  id: string;
}

export interface DeleteCardResult {
  success: boolean;
}

export class DeleteCardUseCase {
  constructor(private cardRepository: CardRepository) {}

  async execute(input: DeleteCardInput): Promise<DeleteCardResult> {
    if (!input.id) {
      throw new ValidationError("Card ID is required");
    }

    await this.cardRepository.deleteCard(input.id);

    return { success: true };
  }
}
