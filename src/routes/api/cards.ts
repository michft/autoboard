import { APIEvent } from "@solidjs/start/server";
import { db } from "~/db";
import { kanbanCards } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export async function GET({ request }: APIEvent) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    let query = db.select().from(kanbanCards);

    if (projectId) {
      const cards = await db
        .select()
        .from(kanbanCards)
        .where(eq(kanbanCards.projectId, projectId));
      return Response.json(cards);
    }

    const cards = await db.select().from(kanbanCards);
    return Response.json(cards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    return Response.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

export async function POST({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { title, description, columnId, projectId } = body;

    if (!columnId || !projectId) {
      return Response.json(
        { error: "ColumnId and projectId are required" },
        { status: 400 }
      );
    }

    if (!description && !title) {
      return Response.json(
        { error: "Either title or description is required" },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const now = new Date();

    const newCard = await db
      .insert(kanbanCards)
      .values({
        id,
        title: title || null,
        description: description || null,
        columnId,
        projectId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return Response.json(newCard[0], { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);
    return Response.json({ error: "Failed to create card" }, { status: 500 });
  }
}

export async function PATCH({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { id, columnId, title, description } = body;

    if (!id) {
      return Response.json({ error: "Card ID is required" }, { status: 400 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (columnId !== undefined) updateData.columnId = columnId;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const updatedCard = await db
      .update(kanbanCards)
      .set(updateData)
      .where(eq(kanbanCards.id, id))
      .returning();

    if (updatedCard.length === 0) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }

    return Response.json(updatedCard[0]);
  } catch (error) {
    console.error("Error updating card:", error);
    return Response.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE({ request }: APIEvent) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: "Card ID is required" }, { status: 400 });
    }

    await db.delete(kanbanCards).where(eq(kanbanCards.id, id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting card:", error);
    return Response.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
