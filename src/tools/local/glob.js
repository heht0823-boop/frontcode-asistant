/**
 * 文件路径搜索工具。
 * 通过 glob 模式在项目中查找文件，自动跳过常见产物目录。
 */
import fs from "fs";
import path from "path";
import { minimatch } from "minimatch";

/** 最大返回文件数量 */
const maxResults = 1000;

/** 默认忽略目录 */
const ignoreDirs = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  ".cache",
  ".output",
]);

/**
 * 递归遍历目录。
 * @param {string} dir - 要遍历的目录
 * @returns {Generator<string>} 文件路径生成器
 */
function* walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name) && !entry.name.startsWith(".")) {
        yield* walkDir(entryPath);
      }
      continue;
    }

    if (entry.isFile()) {
      yield entryPath;
    }
  }
}

export default {
  define: {
    name: "glob",
    description:
      "根据 glob 模式查找文件，例如 '*.js' 或 'src/**/*.ts'，返回匹配的文件路径列表。",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "glob 匹配模式，例如 '*.js'、'src/**/*.ts'",
        },
        search_path: {
          type: "string",
          description: "搜索的根目录，默认为当前工作目录",
        },
      },
      required: ["pattern"],
    },
  },

  /**
   * 查找匹配文件。
   * @param {{pattern: string, search_path?: string}} params - 工具参数
   * @returns {string} 查找结果
   */
  handle({ pattern, search_path }) {
    const root = search_path ? path.resolve(search_path) : process.cwd();

    if (!fs.existsSync(root)) {
      return `搜索路径不存在: ${root}`;
    }

    if (!fs.statSync(root).isDirectory()) {
      return `搜索路径不是目录: ${root}`;
    }

    const matches = [];

    try {
      for (const filePath of walkDir(root)) {
        const relativePath = path.relative(root, filePath);
        if (minimatch(relativePath, pattern, { matchBase: true })) {
          matches.push(relativePath);
          if (matches.length >= maxResults) {
            break;
          }
        }
      }
    } catch (error) {
      return `搜索出错: ${error.message}`;
    }

    if (matches.length === 0) {
      return `未找到匹配 '${pattern}' 的文件。`;
    }

    const truncated =
      matches.length >= maxResults ? `（结果已截断，最多返回 ${maxResults} 条）` : "";

    return `找到 ${matches.length} 个匹配文件${truncated}:\n${matches.join("\n")}`;
  },
};
