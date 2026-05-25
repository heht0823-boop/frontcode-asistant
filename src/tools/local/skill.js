/**
 * Skill 文件读取工具。
 * 用于按路径加载指定 SKILL.md 的完整内容。
 */
import fs from "fs";
import path from "path";

export default {
  define: {
    name: "skill",
    description: "加载 skill 的详情时使用",
    inputSchema: {
      type: "object",
      properties: {
        skillpath: {
          type: "string",
          description: "要加载的 skill 文件路径",
        },
      },
      required: ["skillpath"],
    },
  },

  /**
   * 读取 skill 文件内容。
   * @param {{skillpath: string}} params - 工具参数
   * @returns {string} skill 文件内容
   */
  handle({ skillpath }) {
    const content = fs.readFileSync(path.resolve(skillpath), "utf-8");
    return `skill 的内容为:\n${content}`;
  },
};
