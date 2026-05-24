// 整个项目的启动入口
import inquirer from "inquirer";
import "dotenv/config";

import { getValidatedConfig } from "./utils/config.js";
import { welcome } from "./utils/init.js";
import { saveHistory } from "./utils/fshandle.js";
import { selectCommand, selectFile } from "./utils/interactive.js";
import {
  commands,
  ensureSpecFile,
  handleCommand,
  chooseFileAttachment,
} from "./commands/index.js";

const config = getValidatedConfig();

async function startChat() {
  await ensureSpecFile();

  const history = [];
  const attachedFiles = [];

  welcome(config.model);

  while (true) {
    const { line } = await inquirer.prompt([
      {
        type: "input",
        name: "line",
        message: "你 >",
      },
    ]);

    const message = line.trim();

    if (!message) {
      continue;
    }

    if (message.includes("@")) {
      try {
        await chooseFileAttachment(message, attachedFiles);
      } catch (error) {
        console.log(`文件选择失败: ${error.message}`);
      }
      console.log("");
      continue;
    }

    let command = message;
    if (message.startsWith("/") && !message.includes(" ")) {
      command = await selectCommand(message, commands);
    }

    const result = await handleCommand(
      command,
      message,
      history,
      attachedFiles,
      saveHistory,
      selectCommand,
      selectFile,
    );

    if (result.exit) {
      break;
    }
  }
}

startChat().catch((error) => {
  console.log("");
  console.log(`启动失败: ${error.message}`);
  console.log("");
  process.exitCode = 1;
});
