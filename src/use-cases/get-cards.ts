import type { Card } from "~/db/types";
import type { CardRepository } from "~/db/repositories/card-repository";

export interface GetCardsInput {
  projectId?: string;
}

export interface GetCardsResult {
  cards: Card[];
}

export class GetCardsUseCase {
  constructor(private cardRepository: CardRepository) {}

  async execute(input: GetCardsInput): Promise<GetCardsResult> {
    let cards: Card[];

    if (input.projectId) {
      cards = await this.cardRepository.getCardsByProjectId(input.projectId);
    } else {
      cards = await this.cardRepository.getAllCards();
    }

    return { cards };
  }
}
