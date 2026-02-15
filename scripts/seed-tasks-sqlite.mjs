#!/usr/bin/env node
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import yaml from "js-yaml";

const args = process.argv.slice(2);
const { positional, flags } = parseArgs(args);

if (flags.help || flags.h) {
  printHelp();
  process.exit(0);
}

const tasksPathFlag = flags.file ?? flags.tasks ?? positional[0];
if (!tasksPathFlag) {
  console.error("Please specify a tasks YAML file with --file, --tasks or as the first argument.");
  printHelp();
  process.exit(1);
}

const tasksPath = resolvePath(tasksPathFlag);
const dbPath = resolvePath(flags.db ?? "packages/db/drizzle/db.sqlite");
const columnId = flags.column ?? "todo";
const includeCompleted = hasFlag(flags, "include-completed");
const dryRun = hasFlag(flags, "dry-run");

(async () => {
  try {
    const tasks = await readTasks(tasksPath);
    const entries = flattenTasks(tasks);
    if (entries.length === 0) {
      console.log("The task list did not contain any entries.");
      process.exit(0);
    }

    const db = new Database(dbPath);
    try {
      const project = resolveProject(db, {
        projectId: flags["project-id"],
        projectPath: flags["project-path"] ?? flags.project,
        projectName: flags["project-name"],
      });

      const insertStmt = db.prepare(
        "INSERT INTO kanban_cards (id, title, description, column_id, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      );

      let inserted = 0;
      for (const task of entries) {
        if (!task.title) {
          console.warn("Skipping a task without a title.");
          continue;
        }
        if (!includeCompleted && task.completed === true) {
          console.info(`Skipping completed task: ${task.title}`);
          continue;
        }

        const description = buildDescription(task);
        if (dryRun) {
          console.log(`[DRY RUN] ${project.name} (${project.id}) › ${columnId} › ${task.title}`);
          if (description) console.log(description);
          continue;
        }

        insertStmt.run(
          crypto.randomUUID(),
          task.title,
          description ?? null,
          columnId,
          project.id,
          Date.now(),
          Date.now(),
        );
        inserted += 1;
      }

      console.log(`${dryRun ? "Would have created" : "Created"} ${dryRun ? entries.length : inserted} cards for project ${project.name}.`);
    } finally {
      db.close();
    }
  } catch (error) {
    console.error("Fatal:", error.message);
    process.exit(1);
  }
})();

function parseArgs(argList) {
  const flags = {};
  const positional = [];
  let pending;
  for (const token of argList) {
    if (token === "-h") {
      flags.help = true;
      continue;
    }
    if (token.startsWith("--")) {
      const [key, value] = token.slice(2).split("=", 2);
      flags[key] = value ?? true;
      pending = value === undefined ? key : undefined;
    } else if (pending) {
      flags[pending] = token;
      pending = undefined;
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

function flattenTasks(payload) {
  if (Array.isArray(payload)) {
    return payload.map((task) => ({ ...task, sourceGroup: null }));
  }
  const entries = [];
  for (const [group, tasks] of Object.entries(payload)) {
    if (Array.isArray(tasks)) {
      for (const task of tasks) {
        entries.push({ ...task, sourceGroup: group });
      }
    }
  }
  return entries;
}

function buildDescription(task) {
  const parts = [];
  if (task.sourceGroup) {
    parts.push(`Group: ${task.sourceGroup}`);
  }
  if (task.description) {
    parts.push(task.description);
  }
  const metadata = [];
  if (task.model) metadata.push(`Model: ${task.model}`);
  if (task.parallel_group !== undefined) metadata.push(`Parallel group: ${task.parallel_group}`);
  if (task.completed !== undefined) metadata.push(`Completed: ${task.completed}`);
  if (metadata.length) {
    parts.push(metadata.join(" • "));
  }
  return parts.join("\n\n") || undefined;
}

function resolveProject(db, { projectId, projectPath, projectName }) {
  if (projectId) {
    const stmt = db.prepare("SELECT id, name, file_path FROM projects WHERE id = ?");
    const row = stmt.get(projectId);
    if (!row) {
      throw new Error(`Project id ${projectId} not found.`);
    }
    return row;
  }

  const rows = db.prepare("SELECT id, name, file_path FROM projects ORDER BY created_at").all();
  if (rows.length === 0) {
    throw new Error("No projects exist in the database.");
  }

  if (projectPath) {
    const needle = resolvePath(projectPath);
    const match = rows.find((project) => resolvePath(project.file_path) === needle);
    if (match) return match;
    const fuzzy = rows.filter((project) => resolvePath(project.file_path).startsWith(needle));
    if (fuzzy.length === 1) return fuzzy[0];
    throw new Error(`Could not resolve project for path ${projectPath}`);
  }

  if (projectName) {
    const match = rows.find((project) => project.name === projectName);
    if (match) return match;
    throw new Error(`Project not found with name ${projectName}`);
  }

  if (rows.length === 1) {
    return rows[0];
  }

  throw new Error("Multiple projects exist; specify --project-path, --project-name, or --project-id.");
}

function resolvePath(value) {
  const expanded = value.startsWith("~") ? `${homedir()}${value.slice(1)}` : value;
  return resolve(expanded);
}

function printHelp() {
  console.log(`Usage: seed-tasks-sqlite [options] /path/to/tasks.yaml

Options:
  --file, --tasks PATH       YAML file with either an array or grouped task map
  --db PATH                  Path to the sqlite database (defaults to packages/db/drizzle/db.sqlite)
  --project-id ID            Use the project with this id
  --project-path PATH        Match a project by their file_path (alias: --project)
  --project-name NAME        Match a project by name
  --column COLUMN_ID         Column id for the cards (default: todo)
  --include-completed        Also insert tasks where completed: true
  --dry-run                  Print actions instead of inserting
  --help, -h                 Show this message

Example:
  seed-tasks-sqlite --project-path=~/src/2gf-expo/plans --file=~/src/2gf-expo/plans/tasks.yaml
`);
}
