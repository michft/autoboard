#!/usr/bin/env node
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { projectRepository, CardRepository } from "@autoboard/db";
import { CreateCardUseCase } from "@autoboard/domain";

const args = process.argv.slice(2);
const { positional, flags } = parseArgs(args);

if (flags.help || flags.h) {
  printHelp();
  process.exit(0);
}

const tasksPathFlag = flags.file ?? flags.tasks ?? positional[0];
if (!tasksPathFlag) {
  console.error("Error: Please point to a TODO YAML with --file or by passing it as the first argument.");
  printHelp();
  process.exit(1);
}

const tasksFile = resolvePath(tasksPathFlag);
const projectIdFlag = flags["project-id"];
const projectPathFlag = flags["project-path"] ?? flags.project;
const projectNameFlag = flags["project-name"];
const columnId = flags.column ?? "todo";
const includeCompleted = hasFlag(flags, "include-completed");
const dryRun = hasFlag(flags, "dry-run");

(async () => {
  const payload = await readTasks(tasksFile);
  const entries = flattenTasks(payload);
  if (entries.length === 0) {
    console.log("Nothing to seed: the task list is empty or malformed.");
    process.exit(0);
  }

  const project = await resolveProject({ projectId: projectIdFlag, projectPath: projectPathFlag, projectName: projectNameFlag });
  const cardRepo = new CardRepository();
  const createCard = new CreateCardUseCase(cardRepo);

  let inserted = 0;
  for (const task of entries) {
    if (!task.title) {
      console.warn(`Skipping task without a title (group=${task.sourceGroup ?? "?"})`);
      continue;
    }
    if (!includeCompleted && task.completed === true) {
      console.info(`Skipping already completed task: ${task.title}`);
      continue;
    }

    const description = buildDescription(task);
    if (dryRun) {
      console.log(`DRY RUN: ${project.name} | ${columnId} | ${task.title}`);
      if (description) console.log(description);
    } else {
      await createCard.execute({
        title: task.title,
        description: description || undefined,
        columnId,
        projectId: project.id,
      });
      inserted += 1;
    }
  }

  const verb = dryRun ? "would have created" : "created";
  console.log(`${verb} ${dryRun ? entries.length : inserted} cards for project ${project.name} (${project.id}) in column ${columnId}.`);
  if (dryRun) {
    console.log("Use --dry-run=false or omit --dry-run to persist changes.");
  }
})();

function printHelp() {
  console.log(`Usage: seed-tasks [options] /path/to/tasks.yaml

Options:
  --file, --tasks PATH     Path to the TODO YAML (required)
  --project-path PATH      Match a project by its file_path (can use ~)
  --project-name NAME      Match a project by its name
  --project-id ID          Use a specific project id
  --project PATH           Alias for --project-path
  --column ID              Column ID to seed (defaults to "todo")
  --include-completed      Include tasks where completed: true
  --dry-run                Print what would happen without inserting
  --help, -h               Show this help message

If no project flag is provided and there is only one project in db.sqlite, it will be used automatically.`);
}

function parseArgs(rawArgs) {
  const flags = {};
  const positional = [];
  let pending;
  for (const token of rawArgs) {
    if (token.startsWith("--")) {
      const [key, value] = token.slice(2).split("=", 2);
      flags[key] = value ?? true;
      pending = value === undefined ? key : undefined;
    } else if (pending) {
      flags[pending] = token;
      pending = undefined;
    } else if (token === "-h") {
      flags.help = true;
    } else {
      positional.push(token);
    }
  }
  return { positional, flags };
}

function hasFlag(flags, key) {
  if (!(key in flags)) return false;
  const value = flags[key];
  if (typeof value === "boolean") return value;
  return value !== "false";
}

async function readTasks(path) {
  const blob = await readFile(path, "utf8");
  const data = yaml.load(blob);
  if (!data || typeof data !== "object") return [];
  if ("tasks" in data) return data.tasks;
  return data;
}

function flattenTasks(data) {
  if (Array.isArray(data)) {
    return data.map((task) => ({ ...task, sourceGroup: null }));
  }
  const entries = [];
  for (const [group, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        entries.push({ ...item, sourceGroup: group });
      }
    }
  }
  return entries;
}

function buildDescription(task) {
  const pieces = [];
  if (task.sourceGroup) {
    pieces.push(`Group: ${task.sourceGroup}`);
  }
  if (task.description) {
    pieces.push(task.description);
  }
  const metadata = [];
  if (task.model) metadata.push(`Model: ${task.model}`);
  if (task.parallel_group !== undefined) metadata.push(`Parallel group: ${task.parallel_group}`);
  if (task.completed !== undefined) metadata.push(`Completed: ${task.completed}`);
  if (metadata.length) pieces.push(metadata.join(" • "));
  return pieces.join("\n\n") || undefined;
}

async function resolveProject({ projectId, projectPath, projectName }) {
  if (projectId) {
    const project = await projectRepository.getProjectById(projectId);
    if (!project) throw new Error(`Project id ${projectId} not found`);
    return project;
  }
  const projects = await projectRepository.getAllProjects();
  if (projectPath) {
    const needle = resolvePath(projectPath);
    const match = projects.find((project) => resolvePath(project.filePath) === needle);
    if (match) return match;
    const fuzzyMatches = projects.filter((project) => resolvePath(project.filePath).startsWith(needle));
    if (fuzzyMatches.length === 1) return fuzzyMatches[0];
    throw new Error(`Project not found for path ${projectPath}`);
  }
  if (projectName) {
    const match = projects.find((project) => project.name === projectName);
    if (match) return match;
    throw new Error(`Project not found with name ${projectName}`);
  }
  if (projects.length === 1) return projects[0];
  throw new Error(`Multiple projects exist; specify one with --project-path, --project-name, or --project-id`);
}

function resolvePath(input) {
  const expanded = input.startsWith("~") ? `${homedir()}${input.slice(1)}` : input;
  return resolve(expanded);
}
