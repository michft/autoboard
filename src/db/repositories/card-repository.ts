import { db } from "~/db";
import { kanbanCards } from "~/db/schema";
import { eq } from "drizzle-orm";
import type { Card, CreateCardData, UpdateCardData } from "~/db/types";

/**
 * Card repository - handles all card-related database operations.
 * This is the only place that knows about Drizzle ORM.
 */
export class CardRepository {
  /**
   * Get all cards
   */
  async getAllCards(): Promise<Card[]> {
    const results = await db.select().from(kanbanCards);
    return results.map(this.mapToDomain);
  }

  /**
   * Get cards by project ID
   */
  async getCardsByProjectId(projectId: string): Promise<Card[]> {
    const results = await db
      .select()
      .from(kanbanCards)
      .where(eq(kanbanCards.projectId, projectId));
    
    return results.map(this.mapToDomain);
  }

  /**
   * Get a card by ID
   */
  async getCardById(id: string): Promise<Card | null> {
    const results = await db
      .select()
      .from(kanbanCards)
      .where(eq(kanbanCards.id, id))
      .limit(1);
    
    if (results.length === 0) {
      return null;
    }
    
    return this.mapToDomain(results[0]);
  }

  /**
   * Create a new card
   */
  async createCard(data: CreateCardData): Promise<Card> {
    const results = await db
      .insert(kanbanCards)
      .values({
        id: data.id,
        title: data.title,
        description: data.description,
        columnId: data.columnId,
        projectId: data.projectId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();
    
    return this.mapToDomain(results[0]);
  }

  /**
   * Update a card by ID
   */
  async updateCard(id: string, updates: UpdateCardData): Promise<Card> {
    const updateData: Partial<typeof kanbanCards.$inferInsert> = {
      updatedAt: updates.updatedAt,
    };

    if (updates.columnId !== undefined) updateData.columnId = updates.columnId;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;

    const results = await db
      .update(kanbanCards)
      .set(updateData)
      .where(eq(kanbanCards.id, id))
      .returning();

    if (results.length === 0) {
      throw new Error("Card not found");
    }

    return this.mapToDomain(results[0]);
  }

  /**
   * Delete a card by ID
   */
  async deleteCard(id: string): Promise<void> {
    await db.delete(kanbanCards).where(eq(kanbanCards.id, id));
  }

  /**
   * Map Drizzle schema type to domain type
   */
  private mapToDomain(row: typeof kanbanCards.$inferSelect): Card {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      columnId: row.columnId,
      projectId: row.projectId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

// Export a singleton instance
export const cardRepository = new CardRepository();
