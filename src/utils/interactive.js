/**
 * 交互式选择工具模块
 * 提供命令选择和文件选择的交互式搜索功能
 */
import search from "@inquirer/search";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/** 忽略的目录集合 */
const ignoredDirs = new Set([".git", "node_modules", ".front"]);

/** 文件大小限制（200KB） */
const maxFileBytes = 200_000;

/**
 * 统一路径分隔符为斜杠
 * @param {string} filePath - 文件路径
 * @returns {string} 标准化后的路径
 */
function normalizeSlash(filePath) {
  return filePath.split(path.sep).join("/");
}

/**
 * 获取命令前缀
 * @param {string} input - 用户输入
 * @returns {string} 以 / 开头的命令前缀
 */
function getCommandPrefix(input) {
  const trimmed = input.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * 从输入中提取文件搜索关键词
 * @param {string} input - 用户输入（可能包含 @）
 * @returns {string} 文件搜索关键词
 */
function getFileSearchTerm(input) {
  const atIndex = input.lastIndexOf("@");
  if (atIndex === -1) {
    return input.trim();
  }

  return input.slice(atIndex + 1).trim();
}

/**
 * 递归列出项目中的所有文件
 * @param {string} dir - 当前目录
 * @param {string} root - 项目根目录
 * @returns {Promise<string[]>} 文件路径列表
 */
async function listProjectFiles(dir, root = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    // 跳过忽略的隐藏目录
    if (entry.name.startsWith(".") && ignoredDirs.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 递归处理子目录（排除忽略目录）
      if (!ignoredDirs.has(entry.name)) {
        files.push(...(await listProjectFiles(absolutePath, root)));
      }
      continue;
    }

    if (entry.isFile()) {
      // 存储相对路径
      files.push(normalizeSlash(path.relative(root, absolutePath)));
    }
  }

  // 按字母顺序排序
  return files.sort((a, b) => a.localeCompare(b));
}

/**
 * 交互式选择命令
 * @param {string} input - 用户输入的命令前缀
 * @param {Map<string, string>} commands - 命令映射表
 * @returns {Promise<string>} 用户选择的命令或原输入
 */
export async function selectCommand(input, commands) {
  const prefix = getCommandPrefix(input);
  const commandList = Array.from(commands.entries()).map(
    ([command, description]) => ({
      command,
      description,
    }),
  );

  // 精确匹配直接返回
  const matches = commandList.filter(({ command }) =>
    command.startsWith(prefix),
  );
  if (matches.length === 1 && matches[0].command === prefix) {
    return prefix;
  }

  // 无匹配返回原输入
  if (matches.length === 0) {
    return input;
  }

  // 显示交互式搜索选择
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

/**
 * 交互式选择项目文件
 * @param {string} input - 用户输入（包含 @ 前缀）
 * @param {Object} options - 选项
 * @param {string} [options.projectRoot] - 项目根目录
 * @returns {Promise<{path: string, absolutePath: string, content: string}>} 文件信息
 */
export async function selectFile(input, options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const searchTerm = getFileSearchTerm(input).toLowerCase();
  const files = await listProjectFiles(projectRoot);

  // 交互式搜索选择文件
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

  // 读取文件内容
  const absolutePath = path.join(projectRoot, selected);
  const fileStat = await stat(absolutePath);

  // 文件大小检查
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
