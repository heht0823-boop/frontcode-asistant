import chalk from "chalk";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";

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

export default {
  log(message, color = "white") {
    const colorFn = chalk[color] || chalk.white;
    console.log(colorFn(message));
  },

  logmarkdown(message) {
    const rendered = marked(message).trim();
    console.log(rendered);
  },
};
