import { Component, For, createSignal } from "solid-js";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface Project {
  id: string;
  name: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TopBarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => Promise<void>;
}

const TopBar: Component<TopBarProps> = (props) => {
  const [projectToDelete, setProjectToDelete] = createSignal<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

  const handleDeleteClick = (
    e: MouseEvent,
    projectId: string,
    projectName: string
  ) => {
    e.stopPropagation();
    setProjectToDelete({ id: projectId, name: projectName });
  };

  const handleConfirmDelete = async () => {
    const project = projectToDelete();
    if (!project || isDeleting()) return;

    setIsDeleting(true);
    try {
      await props.onDeleteProject(project.id);
      setProjectToDelete(null);
    } catch (error) {
      // Error is already handled in the parent component
      // Keep modal open so user can see the error or try again
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (!isDeleting()) {
      setProjectToDelete(null);
    }
  };

  const getProjectToDelete = () => {
    const project = projectToDelete();
    return project ? project.name : "";
  };

  return (
    <>
      <div class="top-bar">
        <button
          class="top-bar__open-button"
          onClick={props.onNewProject}
          aria-label="Open Directory"
          title="Open Directory"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
        <div class="top-bar__tabs">
          <For each={props.projects}>
            {(project) => (
              <div
                class={`top-bar__tab ${
                  props.selectedProjectId === project.id
                    ? "top-bar__tab--active"
                    : ""
                }`}
                onClick={() => props.onSelectProject(project.id)}
              >
                <span class="top-bar__tab-label">{project.name}</span>
                <button
                  class="top-bar__tab-delete"
                  onClick={(e) =>
                    handleDeleteClick(e, project.id, project.name)
                  }
                  aria-label={`Delete ${project.name}`}
                >
                  ×
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
      <ConfirmDeleteModal
        isOpen={projectToDelete() !== null}
        projectName={getProjectToDelete()}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting()}
      />
    </>
  );
};

export default TopBar;
