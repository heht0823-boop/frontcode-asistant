/**
 * 记忆读取工具。
 * 供模型读取当前项目级和用户级记忆内容。
 */
import { getNowMemory } from "../../utils/memoryUtils.js";

export default {
  define: {
    name: "memory_get",
    description: "读取当前项目级和用户级记忆内容。",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  /**
   * 读取当前记忆。
   * @returns {string} 记忆内容
   */
  handle() {
    const memory = getNowMemory();
    return JSON.stringify(memory, null, 2);
  },
};
