/**
 * 本地文件读取工具。
 * 支持限制读取行数，避免一次性把大文件塞进模型上下文。
 */
import fs from "fs";
import path from "path";

/** 单文件最大读取字节数 */
const maxReadSize = 1024 * 1024;

export default {
  define: {
    name: "read_file",
    description:
      "读取指定本地文件的内容，支持通过 offset 和 limit 控制读取范围。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "要读取的文件绝对路径或相对路径",
        },
        offset: {
          type: "integer",
          description: "开始读取的行号，从 1 开始，默认从第 1 行开始",
        },
        limit: {
          type: "integer",
          description: "最多读取的行数，默认读取全部",
        },
      },
      required: ["file_path"],
    },
  },

  /**
   * 读取文件内容。
   * @param {{file_path: string, offset?: number, limit?: number}} params - 工具参数
   * @returns {string} 文件内容或错误信息
   */
  handle({ file_path, offset = 1, limit }) {
    const resolvedPath = path.resolve(file_path);

    if (!fs.existsSync(resolvedPath)) {
      return `文件不存在: ${resolvedPath}`;
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return `路径不是文件: ${resolvedPath}`;
    }

    if (stat.size > maxReadSize) {
      return `文件大小超过 ${maxReadSize} 字节限制，无法读取。请使用其他方式处理大文件。`;
    }

    try {
      const content = fs.readFileSync(resolvedPath, "utf-8");
      const lines = content.split(/\r?\n/);
      const startLine = Math.max(1, offset);
      const startIndex = startLine - 1;

      if (startIndex >= lines.length) {
        return `文件共 ${lines.length} 行，指定的 offset ${offset} 超出范围。`;
      }

      const endIndex = limit
        ? Math.min(lines.length, startIndex + limit)
        : lines.length;
      const selectedLines = lines.slice(startIndex, endIndex);

      return selectedLines
        .map((line, index) => `${startLine + index}: ${line}`)
        .join("\n");
    } catch (error) {
      return `读取文件失败: ${error.message}`;
    }
  },
};
