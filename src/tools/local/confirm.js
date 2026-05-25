/**
 * 终端确认工具。
 * 让模型在需要用户明确授权时发起 yes/no 确认。
 */
import { confirm } from "@inquirer/prompts";

export default {
  define: {
    name: "confirm",
    description: "在终端向用户发起一个确认提问，等待用户输入 yes 或 no。",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "要显示给用户的确认提示文本",
        },
        default: {
          type: "boolean",
          description: "默认选项，true 表示默认 yes，false 表示默认 no",
          default: false,
        },
      },
      required: ["message"],
    },
  },

  /**
   * 发起确认问题。
   * @param {{message: string, default?: boolean}} params - 工具参数
   * @returns {Promise<string>} 用户确认结果
   */
  async handle({ message, default: defaultValue = false }) {
    const answer = await confirm({
      message,
      default: defaultValue,
    });

    return answer ? "用户已确认 (yes)" : "用户已取消 (no)";
  },
};
