/**
 * OpenAI API 请求模块
 */
import { loadConfig } from "../utils/config.js";
import { executeTool, getToolRegistry } from "../tools/index.js";
import { transformToOpenAi } from "../tools/util.js";
import { createOpenAIClient } from "./index.js";

/** 单次请求最多允许连续工具调用的轮数，避免模型陷入循环。 */
const maxToolRounds = 5;

/**
 * 解析工具调用参数。
 * @param {string} rawArguments - OpenAI 返回的参数字符串
 * @returns {Object} 工具参数对象
 */
function parseToolArguments(rawArguments) {
  if (!rawArguments) {
    return {};
  }

  return JSON.parse(rawArguments);
}

/**
 * 调用 OpenAI 模型进行对话（支持工具调用）
 * @param {Array<Object>} history - 对话历史记录，每条消息包含 role 和 content
 * @param {string} systemPrompt - 系统提示词（从外部传入，避免每次调用都读取）
 * @param {string} [userContext=""] - 用户上下文提示词（可选）
 * @param {Array<Object>} [tools=[]] - 可用工具列表（可选）
 * @param {number} [toolRound=0] - 当前工具调用轮数
 * @returns {Promise<string>} 模型返回的响应文本
 */
export async function askAIModel(
  history,
  systemPrompt,
  userContext = "",
  tools = [],
  toolRound = 0,
) {
  // 使用统一的 OpenAI 客户端创建函数
  const openai = await createOpenAIClient();

  // 获取统一工具注册表（本地工具 + MCP 工具）
  const registry = await getToolRegistry();
  if (registry.errors.length > 0) {
    registry.errors.forEach((error) => console.warn(error));
  }

  // 合并外部工具和本地工具，并转换为 OpenAI 格式
  const allTools = [...tools, ...transformToOpenAi(registry.tools)];

  // 构建消息列表：系统提示词 + 用户上下文 + 对话历史
  const messages = [];

  // 添加系统提示词
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  // 添加用户上下文（作为 user 角色的消息）
  if (userContext) {
    messages.push({
      role: "user",
      content: userContext,
    });
  }

  // 添加对话历史
  messages.push(...history);

  // 获取配置用于模型参数
  const config = await loadConfig();

  // 调用 chat.completions.create 接口发送请求
  const response = await openai.chat.completions.create({
    model: config.model,
    messages: messages,
    tools: allTools.length > 0 ? allTools : undefined,
    tool_choice: allTools.length > 0 ? "auto" : undefined,
  });

  const message = response.choices[0].message;

  // 如果模型决定调用工具
  if (message.tool_calls && message.tool_calls.length > 0) {
    if (toolRound >= maxToolRounds) {
      return "工具调用轮数过多，已停止继续调用工具。";
    }

    return await handleToolCalls(
      message,
      history,
      systemPrompt,
      userContext,
      tools,
      toolRound,
    );
  }

  // 返回模型响应内容，若为空则返回默认提示
  return message.content || "模型没有返回文本内容。";
}

/**
 * 处理工具调用
 * @param {Object} message - 包含工具调用的消息
 * @param {Array<Object>} history - 对话历史
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userContext - 用户上下文
 * @param {Array<Object>} tools - 工具列表
 * @param {number} toolRound - 当前工具调用轮数
 * @returns {Promise<string>} 最终响应
 */
async function handleToolCalls(
  message,
  history,
  systemPrompt,
  userContext,
  tools,
  toolRound,
) {
  // OpenAI 要求先追加一次包含完整 tool_calls 的 assistant 消息。
  history.push({
    role: "assistant",
    content: message.content || null,
    tool_calls: message.tool_calls,
  });

  // 执行所有工具调用
  for (const toolCall of message.tool_calls) {
    const toolName = toolCall.function.name;

    // 调用工具
    try {
      const args = parseToolArguments(toolCall.function.arguments);
      const result = await executeTool(toolName, args);

      history.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });
    } catch (error) {
      console.error(`工具调用失败 ${toolName}: ${error.message}`);

      history.push({
        role: "tool",
        content: JSON.stringify({
          content: [{ type: "text", text: `工具调用失败: ${error.message}` }],
          isError: true,
        }),
        tool_call_id: toolCall.id,
      });
    }
  }

  // 递归调用 askAIModel，让模型总结工具调用结果
  return await askAIModel(
    history,
    systemPrompt,
    userContext,
    tools,
    toolRound + 1,
  );
}
