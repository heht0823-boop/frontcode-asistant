/**
 * 统一工具注册表模块。
 * 负责把本地工具和 MCP 工具合并为同一份工具列表与调用映射。
 */
import { linkMcpAndListTool } from "./mcp/index.js";
import getLocalTool from "./local/index.js";

/** 工具注册表初始化 Promise，避免每次请求重复连接 MCP 服务。 */
let registryPromise = null;

/**
 * 创建工具注册表。
 * @returns {Promise<{tools: Array<Object>, toolNameMap: Object, errors: Array<string>}>} 工具注册表
 */
async function createToolRegistry() {
  const localRegistry = await getLocalTool();
  const localTools = Array.isArray(localRegistry?.localTools)
    ? localRegistry.localTools
    : [];
  const localMap = localRegistry?.localMap || {};

  if (!Array.isArray(localRegistry?.localTools)) {
    console.warn("本地工具注册表格式异常，已使用空工具列表兜底。");
  }

  const tools = [...localTools];
  const toolNameMap = { ...localMap };
  const errors = await linkMcpAndListTool(tools, toolNameMap);

  return {
    tools,
    toolNameMap,
    errors,
  };
}

/**
 * 获取缓存后的工具注册表。
 * @returns {Promise<{tools: Array<Object>, toolNameMap: Object, errors: Array<string>}>} 工具注册表
 */
export function getToolRegistry() {
  if (!registryPromise) {
    registryPromise = createToolRegistry();
  }

  return registryPromise;
}

/**
 * 调用指定工具并返回原始 MCP 风格结果。
 * @param {string} name - 工具名称
 * @param {Object} args - 工具参数
 * @returns {Promise<Object>} 工具调用结果
 */
export async function executeTool(name, args) {
  const { toolNameMap } = await getToolRegistry();
  const client = toolNameMap[name];

  if (!client) {
    throw new Error(`未找到工具: ${name}`);
  }

  return client.callTool({
    name,
    arguments: args,
  });
}

/**
 * 兼容旧拼写的工具调用函数。
 * @param {string} name - 工具名称
 * @param {Object} args - 工具参数
 * @returns {Promise<Object>} 工具调用结果
 */
export async function excuteTool(name, args) {
  return executeTool(name, args);
}

export default {
  getToolRegistry,
  executeTool,
  excuteTool,
};
