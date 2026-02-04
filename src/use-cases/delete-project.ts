import type { ProjectRepository } from "~/db/repositories/project-repository";
import { ValidationError, NotFoundError } from "./errors";

export interface DeleteProjectInput {
  id: string;
}

export interface DeleteProjectResult {
  success: boolean;
}

export class DeleteProjectUseCase {
  constructor(private projectRepository: ProjectRepository) {}

  async execute(input: DeleteProjectInput): Promise<DeleteProjectResult> {
    if (!input.id) {
      throw new ValidationError("Project ID is required");
    }

    // Check if project exists first
    const existingProject = await this.projectRepository.getProjectById(input.id);
    if (!existingProject) {
      throw new NotFoundError("Project not found");
    }

    // Delete all cards associated with this project first (cascading delete)
    await this.projectRepository.deleteCardsByProjectId(input.id);

    // Then delete the project itself
    await this.projectRepository.deleteProject(input.id);

    return { success: true };
  }
}
