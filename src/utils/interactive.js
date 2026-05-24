import search from "@inquirer/search";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ignoredDirs = new Set([".git", "node_modules", ".front"]);
const maxFileBytes = 200_000;

function normalizeSlash(filePath) {
  return filePath.split(path.sep).join("/");
}

function getCommandPrefix(input) {
  const trimmed = input.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function getFileSearchTerm(input) {
  const atIndex = input.lastIndexOf("@");
  if (atIndex === -1) {
    return input.trim();
  }

  return input.slice(atIndex + 1).trim();
}

async function listProjectFiles(dir, root = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && ignoredDirs.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...(await listProjectFiles(absolutePath, root)));
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(normalizeSlash(path.relative(root, absolutePath)));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

export async function selectCommand(input, commands) {
  const prefix = getCommandPrefix(input);
  const commandList = Array.from(commands.entries()).map(([command, description]) => ({
    command,
    description,
  }));

  const matches = commandList.filter(({ command }) => command.startsWith(prefix));
  if (matches.length === 1 && matches[0].command === prefix) {
    return prefix;
  }

  if (matches.length === 0) {
    return input;
  }

  return search({
    message: "选择命令",
    pageSize: 8,
    source: async (term = prefix) => {
      const keyword = getCommandPrefix(term);
      return commandList
        .filter(({ command }) => command.startsWith(keyword))
        .map(({ command, description }) => ({
          name: `${command}  ${description}`,
          value: command,
          description,
        }));
    },
  });
}

export async function selectFile(input, options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const searchTerm = getFileSearchTerm(input).toLowerCase();
  const files = await listProjectFiles(projectRoot);

  const selected = await search({
    message: "选择项目文件",
    pageSize: 10,
    source: async (term = searchTerm) => {
      const keyword = (term || searchTerm).toLowerCase();
      return files
        .filter((file) => file.toLowerCase().includes(keyword))
        .map((file) => ({
          name: file,
          value: file,
        }));
    },
  });

  const absolutePath = path.join(projectRoot, selected);
  const fileStat = await stat(absolutePath);

  if (fileStat.size > maxFileBytes) {
    throw new Error(`文件过大，已跳过: ${selected}`);
  }

  const content = await readFile(absolutePath, "utf8");
  return {
    path: selected,
    absolutePath,
    content,
  };
}
