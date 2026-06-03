/**
 * 记忆保存工具。
 * 供模型将项目级或用户级记忆写入固定记忆文件。
 */
import fs from "fs";
import path from "path";
import { getMemoryPaths } from "../../utils/memoryUtils.js";

/** 允许写入的记忆类型 */
const allowedScopes = new Set(["project", "user"]);

export default {
  define: {
    name: "memory_save",
    description:
      "保存项目级或用户级记忆。project 写入当前项目，user 写入用户全局记忆。",
    inputSchema: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["project", "user"],
          description: "记忆范围，project 表示当前项目，user 表示用户全局",
        },
        content: {
          type: "string",
          description: "完整的记忆 Markdown 内容",
        },
      },
      required: ["scope", "content"],
    },
  },

  /**
   * 保存记忆内容。
   * @param {{scope: string, content: string}} params - 工具参数
   * @returns {string} 保存结果
   */
  handle({ scope, content }) {
    if (!allowedScopes.has(scope)) {
      return `不支持的记忆范围: ${scope}`;
    }

    const paths = getMemoryPaths();
    const targetPath =
      scope === "project" ? paths.projectMemory : paths.userMemory;

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, "utf-8");

    return `记忆已保存: ${targetPath}`;
  },
};
