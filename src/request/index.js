/**
 * 请求模块入口
 * 统一管理 AI 模型请求和工具调用
 */
import OpenAI from "openai";
import { loadConfig } from "../utils/config.js";
export { askAIModel } from "./askAI.js";

/**
 * 创建 OpenAI 客户端实例
 * @returns {Promise<OpenAI>} 配置好的 OpenAI 客户端
 */
export async function createOpenAIClient() {
  const config = await loadConfig();
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

// 为了兼容旧的默认导入
export default createOpenAIClient;
