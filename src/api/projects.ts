export interface Project {
  id: string;
  name: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetches all projects from the API
 */
export async function getProjects(): Promise<Project[]> {
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
}

/**
 * Creates a new project
 */
export async function createProject(name: string, filePath: string): Promise<Project> {
  if (typeof window === "undefined") {
    throw new Error("Cannot create project on server side");
  }
  
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
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(errorData.error || "Failed to create project");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
}

/**
 * Deletes a project by ID
 */
export async function deleteProject(id: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Cannot delete project on server side");
  }
  
  try {
    const response = await fetch("/api/projects", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      const errorMessage = errorData.error || "Failed to delete project. Please try again.";
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}
