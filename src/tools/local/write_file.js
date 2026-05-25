/**
 * 本地文件写入工具。
 * 用于让模型在用户确认后的开发流程中创建或覆盖文件。
 */
import fs from "fs";
import path from "path";

export default {
  define: {
    name: "write_file",
    description: "将内容写入指定文件路径，如果目录不存在则自动创建。",
    inputSchema: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "要写入的文件路径，支持绝对路径或相对路径",
        },
        content: {
          type: "string",
          description: "要写入文件的内容",
        },
      },
      required: ["file_path", "content"],
    },
  },

  /**
   * 写入文件内容。
   * @param {{file_path: string, content: string}} params - 工具参数
   * @returns {string} 写入结果
   */
  handle({ file_path, content }) {
    const resolvedPath = path.resolve(file_path);

    try {
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, content, "utf-8");

      return `文件写入成功: ${resolvedPath}\n\n写入内容:\n${content}`;
    } catch (error) {
      return `文件写入失败: ${error.message}`;
    }
  },
};
