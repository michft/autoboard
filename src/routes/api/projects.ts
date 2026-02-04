import { APIEvent } from "@solidjs/start/server";
import { projectRepository } from "~/db/repositories";
import {
  GetProjectsUseCase,
  CreateProjectUseCase,
  DeleteProjectUseCase,
} from "~/use-cases";
import { ValidationError, NotFoundError } from "~/use-cases/errors";

export async function GET({ request }: APIEvent) {
  try {
    const useCase = new GetProjectsUseCase(projectRepository);
    const result = await useCase.execute();
    return Response.json(result.projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return Response.json(
      {
        error: "Failed to fetch projects",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { name, filePath } = body;

    const useCase = new CreateProjectUseCase(projectRepository);
    const result = await useCase.execute({ name, filePath });

    return Response.json(result.project, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating project:", error);
    return Response.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

export async function DELETE({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { id } = body;

    const useCase = new DeleteProjectUseCase(projectRepository);
    const result = await useCase.execute({ id });

    return Response.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    console.error("Error deleting project:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack, error });
    return Response.json(
      {
        error: "Failed to delete project",
        details: errorMessage,
        ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}
