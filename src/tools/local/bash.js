/**
 * 终端命令执行工具。
 * 在 Windows 下使用 PowerShell，在其他系统下使用默认 shell。
 */
import { exec } from "child_process";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

/** 命令执行超时时间 */
const commandTimeout = 60_000;

/**
 * 获取当前平台对应的 shell 配置。
 * @returns {{shell?: string}} child_process.exec 配置片段
 */
function getShellOptions() {
  if (os.platform() === "win32") {
    return { shell: "powershell.exe" };
  }

  return {};
}

export default {
  define: {
    name: "bash",
    description:
      "当需要做一些不能通过其他工具完成的事情时执行终端命令。Windows 使用 PowerShell，其他系统使用默认 shell。",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "要执行的终端命令，请根据用户操作系统生成合适指令",
        },
      },
      required: ["command"],
    },
  },

  /**
   * 执行终端命令。
   * @param {{command: string}} params - 工具参数
   * @returns {Promise<string>} 命令执行结果
   */
  async handle({ command }) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        encoding: "utf8",
        timeout: commandTimeout,
        ...getShellOptions(),
      });

      return `执行成功:\n${stdout}${stderr ? `\n${stderr}` : ""}`;
    } catch (error) {
      return `执行失败: ${error.message}`;
    }
  },
};
