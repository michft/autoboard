import { Component, onMount, onCleanup } from "solid-js";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

const ConfirmDeleteModal: Component<ConfirmDeleteModalProps> = (props) => {
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onCancel();
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onCancel();
    }
  };

  onMount(() => {
    if (typeof document !== "undefined") {
      document.addEventListener("keydown", handleEscape);
    }
  });

  onCleanup(() => {
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", handleEscape);
    }
  });

  return (
    <>
      {props.isOpen && (
        <div
          class="modal-backdrop"
          onClick={handleBackdropClick}
          role="presentation"
        >
          <div class="modal-container" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2 class="modal-title">Delete Project</h2>
              <button
                class="modal-close"
                onClick={props.onCancel}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div class="modal-form">
              <p class="modal-message">
                Are you sure you want to delete{" "}
                <strong>{props.projectName}</strong>? All associated cards will
                be deleted as well. This action cannot be undone.
              </p>
              <div class="modal-actions">
                <button
                  type="button"
                  class="modal-button modal-button--secondary"
                  onClick={props.onCancel}
                  disabled={props.isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="modal-button modal-button--danger"
                  onClick={props.onConfirm}
                  disabled={props.isDeleting}
                >
                  {props.isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfirmDeleteModal;
