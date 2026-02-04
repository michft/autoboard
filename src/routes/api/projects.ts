import { APIEvent } from "@solidjs/start/server";
import { db } from "~/db";
import { projects, kanbanCards } from "~/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET({ request }: APIEvent) {
  try {
    const allProjects = await db.select().from(projects);
    return Response.json(allProjects);
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

    if (!name || !filePath) {
      return Response.json(
        { error: "Name and filePath are required" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const now = new Date();

    const newProject = await db
      .insert(projects)
      .values({
        id,
        name,
        filePath,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return Response.json(newProject[0], { status: 201 });
  } catch (error) {
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

    if (!id) {
      return Response.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Check if project exists first
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    if (existingProject.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete all cards associated with this project first
    await db.delete(kanbanCards).where(eq(kanbanCards.projectId, id));

    // Then delete the project itself
    await db.delete(projects).where(eq(projects.id, id));

    return Response.json({ success: true });
  } catch (error) {
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
