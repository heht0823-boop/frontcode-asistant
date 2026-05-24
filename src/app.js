/**
 * FrontCode Assistant - 终端开发前端编程助手
 *
 * 项目主入口文件，负责初始化应用、处理用户输入、调用命令处理器
 *
 * 主要功能：
 * - 加载配置并验证 API Key
 * - 显示欢迎界面
 * - 处理用户输入（命令和文件选择）
 * - 管理对话历史和文件附件
 */
import inquirer from "inquirer";
import "dotenv/config";

import { getValidatedConfig } from "./utils/config.js";
import { welcome } from "./utils/init.js";
import { saveHistory } from "./utils/fshandle.js";
import { selectCommand, selectFile } from "./utils/interactive.js";
import { readSystem, getUserContext } from "./utils/contextRead.js";
import {
  commands,
  ensureSpecFile,
  handleCommand,
  chooseFileAttachment,
} from "./commands/index.js";

// 验证并加载配置
const config = getValidatedConfig();

// 启动时一次性读取提示词（避免每次调用都读取文件）
const systemPrompt = readSystem();
const userContext = getUserContext();

/**
 * 启动聊天主循环
 * @returns {Promise<void>}
 */
async function startChat() {
  // 确保规格文档存在
  await ensureSpecFile();

  // 初始化对话历史和文件附件
  const history = [];
  const attachedFiles = [];

  // 显示欢迎界面
  welcome(config.model);

  // 主循环：持续接收用户输入
  while (true) {
    // 获取用户输入
    const { line } = await inquirer.prompt([
      {
        type: "input",
        name: "line",
        message: "你 >",
      },
    ]);

    const message = line.trim();

    // 空输入跳过
    if (!message) {
      continue;
    }

    // 处理文件选择（@ 符号）
    if (message.includes("@")) {
      try {
        await chooseFileAttachment(message, attachedFiles);
      } catch (error) {
        console.log(`文件选择失败: ${error.message}`);
      }
      console.log("");
      continue;
    }

    // 处理命令选择（/ 开头）
    let command = message;
    if (message.startsWith("/") && !message.includes(" ")) {
      command = await selectCommand(message, commands);
    }

    // 执行命令处理（传入预加载的提示词）
    const result = await handleCommand(
      command,
      message,
      history,
      attachedFiles,
      saveHistory,
      selectCommand,
      selectFile,
      systemPrompt,
      userContext,
    );

    // 退出标志
    if (result.exit) {
      break;
    }
  }
}

// 启动应用
startChat().catch((error) => {
  console.log("");
  console.log(`启动失败: ${error.message}`);
  console.log("");
  process.exitCode = 1;
});
