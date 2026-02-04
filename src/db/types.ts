/**
 * Domain types for the application.
 * These types are database-agnostic and used throughout the application.
 */

export interface Project {
  id: string;
  name: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  id: string;
  name: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  id: string;
  title: string | null;
  description: string | null;
  columnId: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCardData {
  id: string;
  title: string | null;
  description: string | null;
  columnId: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCardData {
  columnId?: string;
  title?: string;
  description?: string;
  updatedAt: Date;
}
