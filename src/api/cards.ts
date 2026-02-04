export interface Card {
  id: string;
  title: string | null;
  description?: string | null;
  columnId: string;
  projectId: string;
  createdAt?: Date;
  updatedAt?: Date;
  generatingTitle?: boolean;
}

export interface CreateCardParams {
  title?: string;
  description?: string;
  columnId: string;
  projectId: string;
}

export interface UpdateCardParams {
  columnId?: string;
  title?: string;
  description?: string;
}

/**
 * Fetches cards for a specific project
 */
export async function getCards(projectId: string): Promise<Card[]> {
  if (!projectId || typeof window === "undefined") {
    return [];
  }
  
  try {
    const url = `/api/cards?projectId=${encodeURIComponent(projectId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch cards");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching cards:", error);
    throw error;
  }
}

/**
 * Creates a new card
 */
export async function createCard(params: CreateCardParams): Promise<Card> {
  if (typeof window === "undefined") {
    throw new Error("Cannot create card on server side");
  }
  
  try {
    const response = await fetch("/api/cards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: params.title,
        description: params.description,
        columnId: params.columnId,
        projectId: params.projectId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create card");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating card:", error);
    throw error;
  }
}

/**
 * Updates an existing card
 */
export async function updateCard(id: string, updates: UpdateCardParams): Promise<Card> {
  if (typeof window === "undefined") {
    throw new Error("Cannot update card on server side");
  }
  
  try {
    const response = await fetch("/api/cards", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        ...updates,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update card");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating card:", error);
    throw error;
  }
}

/**
 * Deletes a card by ID
 */
export async function deleteCard(id: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Cannot delete card on server side");
  }
  
  try {
    const response = await fetch("/api/cards", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete card");
    }
  } catch (error) {
    console.error("Error deleting card:", error);
    throw error;
  }
}
