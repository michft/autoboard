import { createDraggable } from "@thisbeyond/solid-dnd";
import { Component } from "solid-js";

export interface Card {
  id: string;
  title: string | null;
  description?: string | null;
  columnId: string;
  generatingTitle?: boolean;
}

interface KanbanCardProps {
  card: Card;
  onDelete: (cardId: string) => void;
}

export const CardContent: Component<{ card: Card }> = (props) => {
  return (
    <>
      <div class="kanban-card__title">
        {props.card.generatingTitle ? (
          <div class="kanban-card__title-generating">
            <span class="kanban-card__spinner"></span>
            <span>Generating title...</span>
          </div>
        ) : props.card.title ? (
          props.card.title
        ) : (
          <span class="kanban-card__title-placeholder">Untitled</span>
        )}
      </div>
      {props.card.description && (
        <div class="kanban-card__description">{props.card.description}</div>
      )}
    </>
  );
};

const KanbanCard: Component<KanbanCardProps> = (props) => {
  const draggable = createDraggable(props.card.id);

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    props.onDelete(props.card.id);
  };

  return (
    <div
      use:draggable={() => ({ skipTransform: true })}
      class="kanban-card"
      classList={{
        "kanban-card--dragging": draggable.isActiveDraggable,
      }}
    >
      <CardContent card={props.card} />
      <button
        class="kanban-card__delete"
        onClick={handleDelete}
        aria-label="Delete card"
        title="Delete card"
      >
        ×
      </button>
    </div>
  );
};

export default KanbanCard;
