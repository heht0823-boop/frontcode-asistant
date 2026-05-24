import { readFile } from "fs/promises";
import { join } from "path";
import { getUserHomeDir, getCurrentWorkingDir } from "./pathUtils.js";

/**
 * 加载应用配置
 * 配置读取优先级（从高到低）：
 * 1. 当前终端目录下的 settings.json
 * 2. 用户目录下的 .front/settings.json
 * 3. .env 环境变量
 *
 * @returns {Object} 配置对象，包含 apiKey、baseURL、model
 */
export async function loadConfig() {
  const config = {};

  // 配置文件路径优先级：当前目录 settings.json > 用户目录 .front/settings.json
  const configPaths = [
    join(getCurrentWorkingDir(), "settings.json"),
    join(getUserHomeDir(), ".front", "settings.json"),
  ];

  // 尝试读取配置文件
  for (const configPath of configPaths) {
    try {
      const data = await readFile(configPath, "utf-8");
      const fileConfig = JSON.parse(data);
      Object.assign(config, fileConfig);
    } catch {
      // 文件不存在或读取失败，继续尝试下一个
    }
  }

  // 使用环境变量作为最终备选（优先级最低）
  config.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  config.baseURL = config.baseURL || process.env.OPENAI_API_BASE_URL;
  config.model = config.model || process.env.OPENAI_MODEL || "gpt-5-mini";

  return config;
}

/**
 * 获取配置的同步版本（仅从环境变量读取）
 * 用于需要同步获取配置的场景
 *
 * @returns {Object} 配置对象，包含 apiKey、baseURL、model
 */
export function getConfigSync() {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE_URL,
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
  };
}

/**
 * 验证 API Key 是否存在且有效
 * @returns {boolean} 是否存在有效的 API Key
 */
export function hasApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!apiKey && apiKey.trim() !== "" && apiKey !== "your-api-key-here";
}

/**
 * 获取验证后的配置（确保敏感信息不为空）
 * @returns {Object} 验证后的配置对象
 * @throws {Error} 当必需配置缺失时抛出错误
 */
export function getValidatedConfig() {
  const config = getConfigSync();

  if (!hasApiKey()) {
    throw new Error(
      "缺少有效的 OPENAI_API_KEY 配置。请在 .env 文件或 settings.json 中配置有效的 API Key。",
    );
  }

  return config;
}
