import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
} from "@thisbeyond/solid-dnd";
import { Component, createSignal, createResource, For, Show } from "solid-js";
import KanbanColumn from "./KanbanColumn";
import { Card, CardContent } from "./KanbanCard";
import CreateCardModal from "./CreateCardModal";
import FloatingActionButton from "./FloatingActionButton";

interface Column {
  id: string;
  title: string;
  description?: string;
}

interface KanbanBoardProps {
  projectId: string | null;
}

const fetchCards = async (projectId: string | null): Promise<Card[]> => {
  if (!projectId || typeof window === "undefined") {
    return [];
  }
  const url = `/api/cards?projectId=${encodeURIComponent(projectId)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch cards");
  }
  const data = await response.json();
  return data;
};

const KanbanBoard: Component<KanbanBoardProps> = (props) => {
  const columns: Column[] = [
    { id: "todo", title: "To Do" },
    { id: "in-progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  const [refreshKey, setRefreshKey] = createSignal(0);

  // Access projectId reactively - props.projectId is reactive when accessed
  const currentProjectId = () => props.projectId;

  const [cards, { refetch }] = createResource(
    () => {
      // Only fetch on client side and when projectId is available
      // Access props.projectId directly to ensure reactivity
      const pid = props.projectId;
      if (typeof window === "undefined" || !pid) {
        return null;
      }
      return [refreshKey(), pid] as const;
    },
    ([, projectId]) => fetchCards(projectId),
    { initialValue: [] }
  );

  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [generatingTitles, setGeneratingTitles] = createSignal<Set<string>>(
    new Set()
  );

  const getCardsForColumn = (columnId: string) => {
    const allCards = cards() || [];
    const generatingSet = generatingTitles();
    return allCards
      .filter((card) => card.columnId === columnId)
      .map((card) => ({
        ...card,
        generatingTitle: generatingSet.has(card.id),
      }));
  };

  const handleDeleteCard = async (cardId: string) => {
    if (typeof window === "undefined") return;

    try {
      const response = await fetch("/api/cards", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: cardId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete card");
      }

      // Refresh the cards list after successful deletion
      refetch();
    } catch (error) {
      console.error("Error deleting card:", error);
      alert("Failed to delete card. Please try again.");
    }
  };

  const handleDragEnd = async ({ draggable, droppable }: any) => {
    if (typeof window === "undefined" || !droppable) return;

    const cardId = draggable.id as string;
    const newColumnId = droppable.id as string;

    // Optimistically update UI
    const currentCards = cards() || [];
    const updatedCards = currentCards.map((card) =>
      card.id === cardId ? { ...card, columnId: newColumnId } : card
    );

    // Update in database
    try {
      const response = await fetch("/api/cards", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: cardId,
          columnId: newColumnId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update card");
      }

      // Refresh to ensure consistency
      refetch();
    } catch (error) {
      console.error("Error updating card:", error);
      // Revert optimistic update on error
      refetch();
    }
  };

  const handleCreateCard = async (
    title: string,
    description: string,
    columnId: string
  ) => {
    const pid = currentProjectId();
    if (typeof window === "undefined" || !pid) {
      if (typeof window !== "undefined") {
        alert("Please select a project first.");
      }
      return;
    }

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          columnId,
          projectId: pid,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create card");
      }

      const newCard = await response.json();
      setIsModalOpen(false);
      refetch();

      // If card was created without a title, generate one
      if (!title && description) {
        setGeneratingTitles((prev) => new Set(prev).add(newCard.id));
        
        try {
          const titleResponse = await fetch("/api/generate-title", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ cardId: newCard.id }),
          });

          if (!titleResponse.ok) {
            throw new Error("Failed to generate title");
          }

          // Refresh cards to get the updated title
          refetch();
        } catch (error) {
          console.error("Error generating title:", error);
          // Don't show alert - title generation failure shouldn't block the user
        } finally {
          setGeneratingTitles((prev) => {
            const next = new Set(prev);
            next.delete(newCard.id);
            return next;
          });
        }
      }
    } catch (error) {
      console.error("Error creating card:", error);
      alert("Failed to create card. Please try again.");
    }
  };

  return (
    <>
      <Show
        when={props.projectId}
        fallback={
          <div class="kanban-board">
            <div style="text-align: center; padding: 4rem; color: var(--text-secondary);">
              <p>Please select a project to view its Kanban board.</p>
            </div>
          </div>
        }
      >
        <DragDropProvider onDragEnd={handleDragEnd}>
          <DragDropSensors />
          <div class="kanban-board">
            <div class="kanban-board__columns">
              <For each={columns}>
                {(column) => (
                  <KanbanColumn
                    column={column}
                    cards={getCardsForColumn(column.id)}
                    onDeleteCard={handleDeleteCard}
                    onCreateCard={
                      column.id === "todo"
                        ? () => {
                            setIsModalOpen(true);
                          }
                        : undefined
                    }
                  />
                )}
              </For>
            </div>
          </div>
          <DragOverlay>
            {(draggable) => {
              if (!draggable) return null;
              const currentCard = cards()?.find((c) => c.id === draggable.id);
              if (!currentCard) return null;
              const generatingSet = generatingTitles();
              return (
                <div class="kanban-card">
                  <CardContent
                    card={{
                      ...currentCard,
                      generatingTitle: generatingSet.has(currentCard.id),
                    }}
                  />
                </div>
              );
            }}
          </DragOverlay>
        </DragDropProvider>
        <FloatingActionButton onClick={() => setIsModalOpen(true)} />
        <CreateCardModal
          isOpen={isModalOpen()}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateCard}
        />
      </Show>
    </>
  );
};

export default KanbanBoard;
