import type { Card } from "./cards";

export interface GenerateTitleResponse {
  title: string;
  card: Card;
}

/**
 * Generates a title for a card using AI
 */
export async function generateTitle(cardId: string): Promise<GenerateTitleResponse> {
  if (typeof window === "undefined") {
    throw new Error("Cannot generate title on server side");
  }
  
  try {
    const response = await fetch("/api/generate-title", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cardId }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate title");
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating title:", error);
    throw error;
  }
}
