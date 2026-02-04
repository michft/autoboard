import { randomUUID } from "node:crypto";
import type { Project, CreateProjectData } from "~/db/types";
import type { ProjectRepository } from "~/db/repositories/project-repository";
import { ValidationError } from "./errors";

export interface CreateProjectInput {
  name: string;
  filePath: string;
}

export interface CreateProjectResult {
  project: Project;
}

export class CreateProjectUseCase {
  constructor(private projectRepository: ProjectRepository) {}

  async execute(input: CreateProjectInput): Promise<CreateProjectResult> {
    // Validation
    if (!input.name || !input.filePath) {
      throw new ValidationError("Name and filePath are required");
    }

    // Generate ID and timestamps
    const id = randomUUID();
    const now = new Date();

    const projectData: CreateProjectData = {
      id,
      name: input.name,
      filePath: input.filePath,
      createdAt: now,
      updatedAt: now,
    };

    const project = await this.projectRepository.createProject(projectData);

    return { project };
  }
}
