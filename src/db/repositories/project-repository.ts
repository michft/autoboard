import { db } from "~/db";
import { projects, kanbanCards } from "~/db/schema";
import { eq } from "drizzle-orm";
import type { Project, CreateProjectData } from "~/db/types";

/**
 * Project repository - handles all project-related database operations.
 * This is the only place that knows about Drizzle ORM.
 */
export class ProjectRepository {
  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    const results = await db.select().from(projects);
    return results.map(this.mapToDomain);
  }

  /**
   * Get a project by ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    const results = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    
    if (results.length === 0) {
      return null;
    }
    
    return this.mapToDomain(results[0]);
  }

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectData): Promise<Project> {
    const results = await db
      .insert(projects)
      .values({
        id: data.id,
        name: data.name,
        filePath: data.filePath,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();
    
    return this.mapToDomain(results[0]);
  }

  /**
   * Delete a project by ID
   */
  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  /**
   * Delete all cards associated with a project
   */
  async deleteCardsByProjectId(projectId: string): Promise<void> {
    await db.delete(kanbanCards).where(eq(kanbanCards.projectId, projectId));
  }

  /**
   * Map Drizzle schema type to domain type
   */
  private mapToDomain(row: typeof projects.$inferSelect): Project {
    return {
      id: row.id,
      name: row.name,
      filePath: row.filePath,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

// Export a singleton instance
export const projectRepository = new ProjectRepository();
