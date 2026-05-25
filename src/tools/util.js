/**
 * 将 MCP 工具格式转换为 OpenAI 工具格式。
 * @param {Array<Object>} tools - MCP 工具列表
 * @returns {Array<Object>} OpenAI 格式的工具数组
 */
export function transformToOpenAi(tools) {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.inputSchema || {
        type: "object",
        properties: {},
      },
    },
  }));
}
