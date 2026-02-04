import type { Project } from "~/db/types";
import type { ProjectRepository } from "~/db/repositories/project-repository";

export interface GetProjectsResult {
  projects: Project[];
}

export class GetProjectsUseCase {
  constructor(private projectRepository: ProjectRepository) {}

  async execute(): Promise<GetProjectsResult> {
    const projects = await this.projectRepository.getAllProjects();
    return { projects };
  }
}
