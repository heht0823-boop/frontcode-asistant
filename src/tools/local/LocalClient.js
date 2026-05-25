/**
 * 本地工具客户端。
 * 用 MCP 的 listTools/callTool 返回格式包装项目内置工具。
 */
export default class LocalClient {
  /**
   * 创建本地工具客户端。
   */
  constructor() {
    this.tools = new Map();
  }

  /**
   * 注册一个本地工具。
   * @param {{define: Object, handle: Function}} tool - 本地工具对象
   */
  registerTool(tool) {
    this.tools.set(tool.define.name, tool);
  }

  /**
   * 调用本地工具。
   * @param {Object} options - 调用参数
   * @param {string} options.name - 工具名称
   * @param {Object} options.arguments - 工具参数
   * @returns {Promise<{content: Array<{type: string, text: string}>, isError?: boolean}>} MCP 风格工具结果
   */
  async callTool({ name, arguments: args }) {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        content: [{ type: "text", text: `Error: 未找到工具 ${name}` }],
        isError: true,
      };
    }

    try {
      const content = await tool.handle(args || {});

      return {
        content: [
          {
            type: "text",
            text: String(content),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }

  /**
   * 获取已注册工具定义。
   * @returns {{tools: Array<Object>}} MCP 风格工具定义列表
   */
  listTools() {
    return {
      tools: Array.from(this.tools.values()).map((tool) => tool.define),
    };
  }
}
