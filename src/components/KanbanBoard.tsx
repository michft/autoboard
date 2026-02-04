import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
} from "@thisbeyond/solid-dnd";
import { Component, createSignal, createResource, For, Show } from "solid-js";
import KanbanColumn from "./KanbanColumn";
import { CardContent } from "./KanbanCard";
import type { Card } from "~/api/cards";
import { getCards, createCard, updateCard, deleteCard } from "~/api/cards";
import { generateTitle } from "~/api/generate-title";
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
    ([, projectId]) => getCards(projectId),
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
      await deleteCard(cardId);
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
      await updateCard(cardId, { columnId: newColumnId });
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
      const newCard = await createCard({
        title: title || undefined,
        description,
        columnId,
        projectId: pid,
      });
      setIsModalOpen(false);
      refetch();

      // If card was created without a title, generate one
      if (!title && description) {
        setGeneratingTitles((prev) => new Set(prev).add(newCard.id));
        
        try {
          await generateTitle(newCard.id);
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
