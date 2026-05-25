/**
 * OpenAI API 请求模块
 */
import OpenAI from "openai";
import { loadConfig } from "../utils/config.js";
import { getLocalTool } from "../tools/local/index.js";
import { transformToOpenAi } from "../tools/util.js";

/**
 * 调用 OpenAI 模型进行对话（支持工具调用）
 * @param {Array<Object>} history - 对话历史记录，每条消息包含 role 和 content
 * @param {string} systemPrompt - 系统提示词（从外部传入，避免每次调用都读取）
 * @param {string} [userContext=""] - 用户上下文提示词（可选）
 * @param {Array<Object>} [tools=[]] - 可用工具列表（可选）
 * @returns {Promise<string>} 模型返回的响应文本
 */
export async function askAIModel(
  history,
  systemPrompt,
  userContext = "",
  tools = [],
) {
  // 加载配置
  const config = await loadConfig();

  // 创建 OpenAI 客户端实例
  const openai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  // 获取本地工具
  const { localTools } = getLocalTool();

  // 合并外部工具和本地工具，并转换为 OpenAI 格式
  const allTools = [...tools, ...transformToOpenAi(localTools)];

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
    return await handleToolCalls(
      message,
      history,
      systemPrompt,
      userContext,
      tools,
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
 * @returns {Promise<string>} 最终响应
 */
async function handleToolCalls(
  message,
  history,
  systemPrompt,
  userContext,
  tools,
) {
  const { localTools, localMap } = getLocalTool();

  // 执行所有工具调用
  for (const toolCall of message.tool_calls) {
    const toolName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    // 查找工具客户端
    const client = localMap[toolName];

    if (!client) {
      console.error(`未找到工具: ${toolName}`);
      continue;
    }

    // 调用工具
    try {
      const result = await client.callTool({ name: toolName, arguments: args });

      // 将工具调用结果添加到对话历史
      history.push({
        role: "assistant",
        content: null,
        tool_calls: [toolCall],
      });

      history.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });
    } catch (error) {
      console.error(`工具调用失败 ${toolName}: ${error.message}`);

      // 添加错误信息到对话历史
      history.push({
        role: "assistant",
        content: null,
        tool_calls: [toolCall],
      });

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
  return await askAIModel(history, systemPrompt, userContext, tools);
}
