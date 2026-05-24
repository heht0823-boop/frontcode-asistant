import OpenAI from "openai";
import { loadConfig } from "../utils/config.js";

/**
 * 调用 OpenAI 模型进行对话
 * @param {Array<Object>} history - 对话历史记录，每条消息包含 role 和 content
 * @returns {string} 模型返回的响应文本
 */
export async function askAIModel(history) {
  // 加载配置
  const config = await loadConfig();

  // 创建 OpenAI 客户端实例
  const openai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  // 调用 chat.completions.create 接口发送请求
  const response = await openai.chat.completions.create({
    model: config.model,
    messages: history,
  });

  // 返回模型响应内容，若为空则返回默认提示
  return response.choices[0].message.content || "模型没有返回文本内容。";
}
