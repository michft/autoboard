import { Component, createSignal, onMount, onCleanup } from "solid-js";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, filePath: string) => void;
}

const CreateProjectModal: Component<CreateProjectModalProps> = (props) => {
  const [name, setName] = createSignal("");
  const [filePath, setFilePath] = createSignal("");

  const extractDirectoryName = (path: string): string => {
    // Extract the last part of the path (directory name)
    const parts = path.split(/[/\\]/).filter(part => part.length > 0);
    return parts.length > 0 ? parts[parts.length - 1] : path;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (filePath().trim()) {
      // Use directory name if project name is not provided
      const projectName = name().trim() || extractDirectoryName(filePath().trim());
      props.onSubmit(projectName, filePath().trim());
      setName("");
      setFilePath("");
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

  const handleBrowseFolder = async () => {
    try {
      if (!("showDirectoryPicker" in window)) {
        alert(
          "Directory selection is not supported in this browser. Please enter the full absolute path manually (e.g., /Users/you/projects/my-app)."
        );
        return;
      }

      const directoryHandle = await (window as any).showDirectoryPicker({
        mode: "read",
      });

      // Note: Browser File System Access API cannot provide the full filesystem path
      // for security reasons. We can only get the directory name.
      const dirName = directoryHandle.name;

      // Auto-populate project name with directory name
      if (!name().trim()) {
        setName(dirName);
      }

      // Alert user that they need to enter the full path manually
      alert(
        `Selected folder: "${dirName}"\n\nFor security reasons, browsers cannot provide the full path. Please enter the complete absolute path manually (e.g., /Users/you/projects/${dirName}).`
      );
    } catch (error: any) {
      // User cancelled the dialog or an error occurred
      if (error.name !== "AbortError" && error.name !== "NotAllowedError") {
        console.error("Error browsing for folder:", error);
        alert(
          "Failed to browse for folder. Please enter the full absolute path manually."
        );
      }
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
              <h2 class="modal-title">Open Directory</h2>
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
                <label for="project-path" class="modal-label">
                  Project Folder Path <span class="required">*</span>
                </label>
                <div class="modal-input-group">
                  <input
                    id="project-path"
                    type="text"
                    class="modal-input modal-input--with-button"
                    value={filePath()}
                    onInput={(e) => {
                      const path = e.currentTarget.value;
                      setFilePath(path);
                      // Auto-populate project name if not already set
                      if (!name().trim() && path.trim()) {
                        const dirName = extractDirectoryName(path.trim());
                        setName(dirName);
                      }
                    }}
                    placeholder="Enter full absolute path (e.g., /Users/you/projects/my-app)"
                    required
                    autofocus
                  />
                  <button
                    type="button"
                    class="modal-browse-button"
                    onClick={handleBrowseFolder}
                    title="Browse for folder"
                  >
                    Browse
                  </button>
                </div>
              </div>
              <div class="modal-field">
                <label for="project-name" class="modal-label">
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  class="modal-input"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  placeholder="Enter project name (optional)"
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
                  disabled={!filePath().trim()}
                >
                  Open Directory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateProjectModal;
