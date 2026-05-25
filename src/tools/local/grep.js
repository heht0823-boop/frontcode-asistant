/**
 * 文件内容搜索工具。
 * 支持正则或普通字符串搜索，并限制扫描文件数量和大小。
 */
import fs from "fs";
import path from "path";
import { minimatch } from "minimatch";

/** 单文件最大扫描字节数 */
const maxFileSize = 1024 * 1024;

/** 最大匹配结果数量 */
const maxMatches = 100;

/** 最大扫描文件数量 */
const maxFiles = 500;

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

/** 默认视为二进制或不适合搜索的扩展名 */
const binaryExts = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".svg",
  ".mp3",
  ".mp4",
  ".wav",
  ".avi",
  ".mov",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".lock",
  ".sum",
]);

/**
 * 判断文件是否适合按文本读取。
 * @param {string} filePath - 文件路径
 * @returns {boolean} 是否为文本文件
 */
function isTextFile(filePath) {
  return !binaryExts.has(path.extname(filePath).toLowerCase());
}

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

/**
 * 转义正则特殊字符。
 * @param {string} value - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 创建搜索正则。
 * @param {string} pattern - 用户输入的搜索模式
 * @returns {RegExp} 搜索正则
 */
function createSearchRegex(pattern) {
  try {
    return new RegExp(pattern, "gm");
  } catch {
    return new RegExp(escapeRegExp(pattern), "gm");
  }
}

export default {
  define: {
    name: "grep",
    description:
      "在当前项目中全局搜索文件内容，支持正则或字符串匹配，可按 glob 过滤文件类型，自动跳过 node_modules、.git、二进制文件等。",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "搜索的正则表达式或普通字符串",
        },
        path: {
          type: "string",
          description: "搜索的根目录，默认为当前工作目录",
        },
        glob: {
          type: "string",
          description: "文件过滤模式，例如 '*.js' 或 'src/**/*.ts'",
        },
        output_mode: {
          type: "string",
          enum: ["files_with_matches", "content"],
          description:
            "files_with_matches 仅返回匹配文件路径；content 返回匹配行及上下文",
        },
      },
      required: ["pattern"],
    },
  },

  /**
   * 搜索文件内容。
   * @param {{pattern: string, path?: string, glob?: string, output_mode?: string}} params - 工具参数
   * @returns {string} 搜索结果
   */
  handle({ pattern, path: searchPath, glob, output_mode = "content" }) {
    const root = searchPath ? path.resolve(searchPath) : process.cwd();

    if (!fs.existsSync(root)) {
      return `搜索路径不存在: ${root}`;
    }

    const regex = createSearchRegex(pattern);
    const matches = [];
    let filesScanned = 0;

    try {
      for (const filePath of walkDir(root)) {
        if (filesScanned >= maxFiles) {
          break;
        }

        if (!isTextFile(filePath)) {
          continue;
        }

        if (glob && !minimatch(filePath, glob, { matchBase: true })) {
          continue;
        }

        const stat = fs.statSync(filePath);
        if (stat.size > maxFileSize) {
          continue;
        }

        filesScanned++;
        const content = fs.readFileSync(filePath, "utf-8");
        const relativePath = path.relative(root, filePath);

        if (output_mode === "files_with_matches") {
          regex.lastIndex = 0;
          if (regex.test(content)) {
            matches.push(relativePath);
          }
        } else {
          const lineMatches = content
            .split(/\r?\n/)
            .map((line, index, lines) => ({ line, index, lines }))
            .filter(({ line }) => {
              regex.lastIndex = 0;
              return regex.test(line);
            })
            .map(({ index, lines }) => ({
              line: index + 1,
              context: lines
                .slice(Math.max(0, index - 1), Math.min(lines.length, index + 2))
                .join("\n"),
            }));

          if (lineMatches.length > 0) {
            matches.push({ file: relativePath, lines: lineMatches });
          }
        }

        if (matches.length >= maxMatches) {
          break;
        }
      }
    } catch (error) {
      return `搜索出错: ${error.message}`;
    }

    if (matches.length === 0) {
      return `未找到匹配项（已扫描 ${filesScanned} 个文件）。`;
    }

    if (output_mode === "files_with_matches") {
      return `找到 ${matches.length} 个匹配文件（已扫描 ${filesScanned} 个文件）:\n${matches.join("\n")}`;
    }

    const parts = [
      `找到 ${matches.length} 个文件包含匹配（已扫描 ${filesScanned} 个文件）:`,
    ];

    for (const match of matches) {
      parts.push(`\n--- ${match.file} ---`);
      for (const line of match.lines) {
        parts.push(`第 ${line.line} 行:`);
        parts.push(line.context);
      }
    }

    return parts.join("\n");
  },
};
