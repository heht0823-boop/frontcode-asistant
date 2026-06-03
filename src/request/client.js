/**
 * OpenAI 客户端工厂模块。
 * 只负责根据项目配置创建 OpenAI SDK 客户端，避免请求入口产生循环依赖。
 */
import OpenAI from "openai";
import { loadConfig } from "../utils/config.js";

/**
 * 创建 OpenAI 客户端实例。
 * @returns {Promise<OpenAI>} 配置好的 OpenAI 客户端
 */
export async function createOpenAIClient() {
  const config = await loadConfig();

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

export default createOpenAIClient;
