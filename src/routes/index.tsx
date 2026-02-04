import { Title } from "@solidjs/meta";
import { createSignal, createResource, onMount, Show } from "solid-js";
import KanbanBoard from "~/components/KanbanBoard";
import TopBar from "~/components/TopBar";
import CreateProjectModal from "~/components/CreateProjectModal";

interface Project {
  id: string;
  name: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
}

const fetchProjects = async (): Promise<Project[]> => {
  // Only fetch on client side
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const response = await fetch("/api/projects");
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      console.error("Failed to fetch projects:", errorData);
      throw new Error(errorData.error || `Failed to fetch projects: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
};

export default function Home() {
  const [selectedProjectId, setSelectedProjectId] = createSignal<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = createSignal(false);
  const [refreshKey, setRefreshKey] = createSignal(0);
  const [shouldFetch, setShouldFetch] = createSignal(false);
  
  // Only create resource on client side to avoid SSR issues
  const [projects, { refetch }] = createResource(
    () => {
      // Only fetch when we're on the client and shouldFetch is true
      if (!shouldFetch() || typeof window === "undefined") {
        return null;
      }
      return refreshKey();
    },
    fetchProjects,
    { initialValue: [] }
  );

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleNewProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateProject = async (name: string, filePath: string) => {
    if (typeof window === "undefined") return;
    
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          filePath,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const newProject = await response.json();
      setIsCreateModalOpen(false);
      setRefreshKey((k) => k + 1);
      setSelectedProjectId(newProject.id);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    }
  };

  const handleDeleteProject = async (projectId: string): Promise<void> => {
    if (typeof window === "undefined") return;
    
    const response = await fetch("/api/projects", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: projectId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      console.error("Failed to delete project:", errorData);
      const errorMessage = errorData.error || "Failed to delete project. Please try again.";
      alert(errorMessage);
      throw new Error(errorMessage);
    }

    // If the deleted project was selected, clear selection
    if (selectedProjectId() === projectId) {
      setSelectedProjectId(null);
    }

    setRefreshKey((k) => k + 1);
  };

  // Trigger fetch on client mount and auto-select first project
  onMount(() => {
    setShouldFetch(true);
    // Wait for projects to load, then auto-select first one
    const checkAndSelect = () => {
      const projs = projects();
      if (projs && projs.length > 0 && !selectedProjectId()) {
        setSelectedProjectId(projs[0].id);
      } else if (projs && projs.length === 0) {
        // If projects haven't loaded yet, check again (but limit retries)
        setTimeout(checkAndSelect, 100);
      }
    };
    // Start checking after a short delay to allow fetch to start
    setTimeout(checkAndSelect, 200);
  });

  const hasProjects = () => {
    const projs = projects();
    return projs && projs.length > 0;
  };

  return (
    <main>
      <Title>Dashboard - Kanban Board</Title>
      <Show
        when={hasProjects()}
        fallback={
          <div class="empty-state">
            <div class="empty-state__content">
              <h2 class="empty-state__title">No Projects Yet</h2>
              <p class="empty-state__description">
                Get started by opening a directory to create your first project.
                You'll be able to organize your tasks with a Kanban board.
              </p>
              <button
                class="empty-state__button"
                onClick={handleNewProject}
              >
                Open Directory
              </button>
            </div>
          </div>
        }
      >
        <TopBar
          projects={projects() || []}
          selectedProjectId={selectedProjectId()}
          onSelectProject={handleSelectProject}
          onNewProject={handleNewProject}
          onDeleteProject={handleDeleteProject}
        />
        <KanbanBoard projectId={selectedProjectId()} />
      </Show>
      <CreateProjectModal
        isOpen={isCreateModalOpen()}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </main>
  );
}
