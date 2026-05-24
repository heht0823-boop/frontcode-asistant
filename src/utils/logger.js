/**
 * 日志工具模块
 * 提供带颜色的终端输出和 Markdown 渲染功能
 */
import chalk from "chalk";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";

// 配置 Markdown 渲染器
marked.setOptions({
  renderer: new TerminalRenderer({
    code: chalk.cyan.bold,
    blockquote: chalk.gray.italic,
    heading: chalk.yellow.bold,
    hr: chalk.gray,
    listitem: chalk.green,
    table: chalk.white,
    link: chalk.blue.underline,
    strong: chalk.bold,
    em: chalk.italic,
  }),
});

/**
 * 日志工具对象
 */
export default {
  /**
   * 输出带颜色的日志
   * @param {string} message - 日志消息
   * @param {string} [color="white"] - 颜色名称
   */
  log(message, color = "white") {
    const colorFn = chalk[color] || chalk.white;
    console.log(colorFn(message));
  },

  /**
   * 输出 Markdown 格式的日志（自动渲染为终端格式）
   * @param {string} message - Markdown 格式的消息
   */
  logmarkdown(message) {
    const rendered = marked(message).trim();
    console.log(rendered);
  },
};
