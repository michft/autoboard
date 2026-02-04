import { createDroppable } from "@thisbeyond/solid-dnd";
import { Component, For, Show } from "solid-js";
import KanbanCard, { Card } from "./KanbanCard";

interface Column {
  id: string;
  title: string;
}

interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  onDeleteCard: (cardId: string) => void;
  onCreateCard?: () => void;
}

const KanbanColumn: Component<KanbanColumnProps> = (props) => {
  const droppable = createDroppable(props.column.id);
  const isEmpty = () => props.cards.length === 0;
  const isTodoColumn = () => props.column.id === "todo";

  return (
    <div
      use:droppable
      class="kanban-column"
      classList={{
        "kanban-column--active": droppable.isActiveDroppable,
      }}
    >
      <div class="kanban-column__header">
        <h2 class="kanban-column__title">{props.column.title}</h2>
        <span class="kanban-column__count">{props.cards.length}</span>
      </div>
      <div class="kanban-column__content">
        <Show
          when={!isEmpty()}
          fallback={
            <Show
              when={isTodoColumn() && props.onCreateCard}
              fallback={
                <div class="kanban-column__empty">
                  <div class="kanban-column__empty-icon">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="9" x2="15" y2="9" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                  </div>
                  <p class="kanban-column__empty-text">No items yet</p>
                </div>
              }
            >
              <div class="kanban-column__empty kanban-column__empty--actionable">
                <div class="kanban-column__empty-icon">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <p class="kanban-column__empty-text">No items yet</p>
                <button
                  class="kanban-column__create-button"
                  onClick={props.onCreateCard}
                  type="button"
                >
                  Create New Item
                </button>
              </div>
            </Show>
          }
        >
          <For each={props.cards}>
            {(card) => <KanbanCard card={card} onDelete={props.onDeleteCard} />}
          </For>
        </Show>
      </div>
    </div>
  );
};

export default KanbanColumn;
