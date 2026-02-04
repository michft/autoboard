import { APIEvent } from "@solidjs/start/server";
import { cardRepository } from "~/db/repositories";
import {
  GetCardsUseCase,
  CreateCardUseCase,
  UpdateCardUseCase,
  DeleteCardUseCase,
} from "~/use-cases";
import { ValidationError, NotFoundError } from "~/use-cases/errors";

export async function GET({ request }: APIEvent) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    const useCase = new GetCardsUseCase(cardRepository);
    const result = await useCase.execute({
      projectId: projectId || undefined,
    });

    return Response.json(result.cards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return Response.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

export async function POST({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { title, description, columnId, projectId } = body;

    const useCase = new CreateCardUseCase(cardRepository);
    const result = await useCase.execute({
      title,
      description,
      columnId,
      projectId,
    });

    return Response.json(result.card, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating card:", error);
    return Response.json({ error: "Failed to create card" }, { status: 500 });
  }
}

export async function PATCH({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { id, columnId, title, description } = body;

    const useCase = new UpdateCardUseCase(cardRepository);
    const result = await useCase.execute({
      id,
      columnId,
      title,
      description,
    });

    return Response.json(result.card);
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    console.error("Error updating card:", error);
    return Response.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { id } = body;

    const useCase = new DeleteCardUseCase(cardRepository);
    const result = await useCase.execute({ id });

    return Response.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Error deleting card:", error);
    return Response.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
