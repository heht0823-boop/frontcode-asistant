import logger from "./logger.js";

/**
 * 渲染欢迎界面
 * @param {string} model - 当前使用的模型名称
 */
export function welcome(model) {
  console.log("");
  logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan");
  logger.log("          FrontCode Assistant", "cyan");
  logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan");
  logger.log("  终端开发前端编程助手已启动", "white");
  console.log("");
  logger.log(`  当前模型: ${model}`, "green");
  console.log("");
  logger.log("  输入 /help 查看命令，输入 /exit 退出", "cyan");
  console.log("");
}
