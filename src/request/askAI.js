/**
 * OpenAI API 请求模块
 */
import OpenAI from "openai";
import { loadConfig } from "../utils/config.js";

/**
 * 调用 OpenAI 模型进行对话
 * @param {Array<Object>} history - 对话历史记录，每条消息包含 role 和 content
 * @param {string} systemPrompt - 系统提示词（从外部传入，避免每次调用都读取）
 * @param {string} [userContext=""] - 用户上下文提示词（可选）
 * @returns {Promise<string>} 模型返回的响应文本
 */
export async function askAIModel(history, systemPrompt, userContext = "") {
  // 加载配置
  const config = await loadConfig();

  // 创建 OpenAI 客户端实例
  const openai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

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
  });

  // 返回模型响应内容，若为空则返回默认提示
  return response.choices[0].message.content || "模型没有返回文本内容。";
}
