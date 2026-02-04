import { APIEvent } from "@solidjs/start/server";
import { query, type Options } from "@anthropic-ai/claude-agent-sdk";
import { db } from "~/db";
import { kanbanCards, projects } from "~/db/schema";
import { eq } from "drizzle-orm";

/**
 * System environment variables to pass to the SDK.
 */
const SYSTEM_ENV_VARS = [
  "PATH",
  "HOME",
  "SHELL",
  "TERM",
  "USER",
  "LANG",
  "LC_ALL",
];

/**
 * Build environment object for the SDK from process.env.
 */
function buildEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const key of SYSTEM_ENV_VARS) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }
  return env;
}

/**
 * POST /api/generate-title
 *
 * Generates a title for a card using Anthropic Agent SDK with Haiku model.
 *
 * Request body:
 * - cardId: string (required) - The ID of the card to generate title for
 *
 * Returns:
 * - 200: { title: string } - The generated title
 * - 400: { error: "..." } for validation errors
 * - 404: { error: "..." } if card not found
 * - 500: { error: "..." } for server errors
 */
export async function POST({ request }: APIEvent) {
  const startTime = Date.now();
  console.log("[generate-title] ===== Starting title generation ===== ");

  try {
    const body = await request.json();
    const { cardId } = body;

    console.log("[generate-title] Received request:", { cardId });

    if (!cardId) {
      console.error("[generate-title] Missing cardId in request");
      return Response.json({ error: "cardId is required" }, { status: 400 });
    }

    // Fetch the card
    console.log("[generate-title] Fetching card from database...");
    const card = await db
      .select()
      .from(kanbanCards)
      .where(eq(kanbanCards.id, cardId))
      .limit(1);

    if (card.length === 0) {
      console.error("[generate-title] Card not found:", cardId);
      return Response.json({ error: "Card not found" }, { status: 404 });
    }

    const kanbanCard = card[0];
    console.log("[generate-title] Card found:", {
      id: kanbanCard.id,
      hasTitle: !!kanbanCard.title,
      hasDescription: !!kanbanCard.description,
      descriptionLength: kanbanCard.description?.length || 0,
    });

    // If card already has a title, return it
    if (kanbanCard.title) {
      console.log(
        "[generate-title] Card already has title, returning:",
        kanbanCard.title
      );
      return Response.json({ title: kanbanCard.title });
    }

    // Need description to generate title
    if (!kanbanCard.description) {
      console.error("[generate-title] Card missing description");
      return Response.json(
        { error: "Card must have a description to generate title" },
        { status: 400 }
      );
    }

    // Fetch the project to get the file path for cwd
    if (!kanbanCard.projectId) {
      console.error("[generate-title] Card has no projectId");
      return Response.json(
        { error: "Card must be associated with a project" },
        { status: 400 }
      );
    }

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, kanbanCard.projectId))
      .limit(1);

    if (project.length === 0) {
      console.error("[generate-title] Project not found:", kanbanCard.projectId);
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const projectPath = project[0].filePath;
    console.log("[generate-title] Using project path as cwd:", projectPath);

    // Generate title using Agent SDK with Haiku model
    const prompt = `Based on the following feature description, generate a concise, descriptive title (maximum 60 characters). Return only the title, nothing else.

Description: ${kanbanCard.description}`;

    console.log("[generate-title] Prompt prepared:", {
      promptLength: prompt.length,
      descriptionPreview: kanbanCard.description.substring(0, 100),
    });

    // Configure agent SDK options matching automaker pattern
    const sdkOptions: Options = {
      model: "claude-haiku-4-5",
      cwd: projectPath,
      maxTurns: 1,
      allowedTools: [],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      env: buildEnv(),
    };

    console.log("[generate-title] SDK options configured:", {
      model: sdkOptions.model,
      maxTurns: sdkOptions.maxTurns,
      cwd: sdkOptions.cwd,
    });

    console.log("[generate-title] Starting agent SDK query...");
    const stream = query({ prompt, options: sdkOptions });

    let generatedTitle = "";
    let messageCount = 0;
    let assistantMessageFound = false;

    console.log("[generate-title] Processing stream messages...");
    for await (const msg of stream) {
      messageCount++;
      // Use any type to access dynamic properties from agent SDK
      const msgAny: any = msg;
      console.log(`[generate-title] Message ${messageCount} received:`, {
        type: msgAny.type,
        subtype: msgAny.subtype,
        hasMessage: !!msgAny.message,
        hasContent: !!msgAny.message?.content,
      });

      // Look for assistant messages with text content
      if (msgAny.type === "assistant" && msgAny.message?.content) {
        assistantMessageFound = true;
        console.log(
          "[generate-title] Assistant message found, processing content..."
        );

        const textBlocks = msgAny.message.content.filter(
          (b: any) => b.type === "text"
        );

        console.log("[generate-title] Text blocks found:", textBlocks.length);

        if (textBlocks.length > 0) {
          // Extract text from the content block
          const textContent = (textBlocks[0] as any).text || "";
          console.log("[generate-title] Text content extracted:", {
            length: textContent.length,
            preview: textContent.substring(0, 100),
          });

          generatedTitle = textContent.trim();
          break; // Got the response, exit loop
        }
      }
    }

    console.log("[generate-title] Stream processing complete:", {
      totalMessages: messageCount,
      assistantMessageFound,
      generatedTitleLength: generatedTitle.length,
      generatedTitle,
    });

    if (!generatedTitle) {
      console.error("[generate-title] No title generated from agent response");
      return Response.json(
        { error: "Failed to generate title - no response from agent" },
        { status: 500 }
      );
    }

    // Clean up the title - remove quotes if present, limit length
    let cleanedTitle = generatedTitle.replace(/^["']|["']$/g, "");
    cleanedTitle = cleanedTitle.substring(0, 60).trim();

    console.log("[generate-title] Title cleaned:", {
      original: generatedTitle,
      cleaned: cleanedTitle,
      length: cleanedTitle.length,
    });

    if (!cleanedTitle) {
      console.error("[generate-title] Title is empty after cleaning");
      return Response.json(
        { error: "Failed to generate title - empty result" },
        { status: 500 }
      );
    }

    // Update the card with the generated title
    console.log("[generate-title] Updating card in database...");
    const updatedCard = await db
      .update(kanbanCards)
      .set({
        title: cleanedTitle,
        updatedAt: new Date(),
      })
      .where(eq(kanbanCards.id, cardId))
      .returning();

    const duration = Date.now() - startTime;
    console.log(
      "[generate-title] ===== Title generation completed successfully =====",
      {
        cardId,
        generatedTitle: cleanedTitle,
        durationMs: duration,
      }
    );

    return Response.json({ title: cleanedTitle, card: updatedCard[0] });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[generate-title] ===== Error generating title =====", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: duration,
    });
    return Response.json(
      { error: "Failed to generate title" },
      { status: 500 }
    );
  }
}
