import { Component, createSignal, onMount, onCleanup, createEffect } from "solid-js";

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, columnId: string) => void;
}

const CreateCardModal: Component<CreateCardModalProps> = (props) => {
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");

  // Reset form when modal opens/closes
  createEffect(() => {
    if (props.isOpen) {
      setTitle("");
      setDescription("");
    }
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    // Allow submission if description is provided, even without title
    if (description().trim()) {
      props.onSubmit(title().trim() || "", description().trim(), "todo");
      setTitle("");
      setDescription("");
    }
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose();
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
              <h2 class="modal-title">Create New Feature</h2>
              <button
                class="modal-close"
                onClick={props.onClose}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <form class="modal-form" onSubmit={handleSubmit}>
              <div class="modal-field">
                <label for="card-description" class="modal-label">
                  Description <span class="required">*</span>
                </label>
                <textarea
                  id="card-description"
                  class="modal-textarea"
                  value={description()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  placeholder="Enter feature description"
                  rows={4}
                  required
                  autofocus
                />
              </div>
              <div class="modal-field">
                <label for="card-title" class="modal-label">
                  Title
                </label>
                <input
                  id="card-title"
                  type="text"
                  class="modal-input"
                  value={title()}
                  onInput={(e) => setTitle(e.currentTarget.value)}
                  placeholder="Enter feature title (optional - will be auto-generated if empty)"
                />
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="modal-button modal-button--secondary"
                  onClick={props.onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="modal-button modal-button--primary"
                  disabled={!description().trim()}
                >
                  Create Feature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateCardModal;
