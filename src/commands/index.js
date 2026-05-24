import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ora from "ora";
import logger from "../utils/logger.js";
import { askAIModel } from "../request/askAI.js";

const projectRoot = process.cwd();
const specPath = path.join(projectRoot, "src", "docs", "spec.md");

const defaultSpec = `# FrontCode Assistant Spec

## 需求文档

- 这是项目的长期需求文档。
- 使用 \`/spec 需求描述\` 时，必须先根据当前需求改造本文件，再规划执行。

## 技术文档

- 项目使用 Node.js + ESM + JavaScript。
- 终端交互入口是 \`src/app.js\`。
- 命令和文件选择交互位于 \`src/utils/interactive.js\`。
- 大模型请求位于 \`src/request/askAI.js\`。

## 规划规范

1. 先理解用户需求和已有文档。
2. 先更新需求文档和技术文档，再输出规划。
3. 如果规划存在错误、缺口或不确定点，返回问题并二次改造文档，不直接执行。
4. 只有规划通过校验后，才根据最终规划执行并输出结果。

## 当前执行记录

- 暂无。
`;

export const commands = new Map([
  ["/help", "查看可用命令"],
  ["/spec", "按规范文档规划并执行需求"],
  ["/context", "查看当前对话和附件状态"],
  ["/clear", "清空当前对话上下文和文件附件"],
  ["/exit", "退出终端对话"],
]);

export function renderHelp() {
  console.log("");
  logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan");
  logger.log("              可用命令", "cyan");
  logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "cyan");
  for (const [command, description] of commands) {
    logger.log(`  ${command.padEnd(10)} ${description}`);
  }
  console.log("");
  logger.log(
    "输入 @ 可选择项目文件；选择后不会立刻请求模型，会作为下一次问题上下文。",
    "gray",
  );
  logger.log(
    "输入 /spec 需求描述 会优先遵循 src/docs/spec.md 规划并执行。",
    "gray",
  );
  console.log("");
}

export async function ensureSpecFile() {
  await mkdir(path.dirname(specPath), { recursive: true });

  try {
    return await readFile(specPath, "utf8");
  } catch {
    await writeFile(specPath, defaultSpec, "utf8");
    return defaultSpec;
  }
}

export function extractSpecRequest(message) {
  return message.replace(/^\/spec\s*/u, "").trim();
}

export function buildFileContext(files) {
  if (files.length === 0) {
    return "";
  }

  return files
    .map((file) =>
      [`文件: ${file.path}`, "```", file.content, "```"].join("\n"),
    )
    .join("\n\n");
}

export function buildUserMessage(message, attachedFiles) {
  const fileContext = buildFileContext(attachedFiles);
  if (!fileContext) {
    return message;
  }

  return [
    "以下项目文件作为本次问题上下文:",
    fileContext,
    "",
    "用户问题:",
    message,
  ].join("\n");
}

function parseTaggedSection(text, tag) {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "u");
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

export async function updateSpecAndPlan(requirement, spec, attachedFiles) {
  const fileContext = buildFileContext(attachedFiles);
  const messages = [
    {
      role: "system",
      content: [
        "你是项目规格文档维护和规划助手。",
        "必须先根据用户需求更新规格文档，再给出执行规划。",
        "如果需求不清晰、规划有明显错误或风险，不要执行，只返回需要修正文档或澄清的问题。",
        "严格使用以下标签输出: <spec>更新后的完整 Markdown 文档</spec><plan>规划内容</plan><issues>问题列表，没有则写无</issues>",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "当前规格文档:",
        spec,
        "",
        fileContext ? `项目文件上下文:\n${fileContext}\n` : "",
        "当前需求:",
        requirement,
      ].join("\n"),
    },
  ];

  const reply = await askAIModel(messages);
  return {
    raw: reply,
    spec: parseTaggedSection(reply, "spec"),
    plan: parseTaggedSection(reply, "plan"),
    issues: parseTaggedSection(reply, "issues"),
  };
}

export async function validatePlan(requirement, spec, plan) {
  const messages = [
    {
      role: "system",
      content: [
        "你是执行规划审查助手。",
        "检查规划是否遵循规格文档、是否遗漏关键步骤、是否存在直接执行风险。",
        "如果有问题，必须给出二次改造后的完整规格文档，不允许继续执行。",
        "严格使用以下标签输出: <status>pass 或 fail</status><spec>需要二次改造时给完整 Markdown 文档，否则留空</spec><feedback>审查反馈</feedback>",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "当前需求:",
        requirement,
        "",
        "规格文档:",
        spec,
        "",
        "待审查规划:",
        plan,
      ].join("\n"),
    },
  ];

  const reply = await askAIModel(messages);
  return {
    raw: reply,
    status: parseTaggedSection(reply, "status").toLowerCase(),
    spec: parseTaggedSection(reply, "spec"),
    feedback: parseTaggedSection(reply, "feedback"),
  };
}

export async function executeSpecPlan(requirement, spec, plan, attachedFiles) {
  const fileContext = buildFileContext(attachedFiles);
  const messages = [
    {
      role: "system",
      content: [
        "你是 FrontCode Assistant 的执行助手。",
        "必须遵循规格文档和最终规划输出结果。",
        "如果发现规划仍然无法执行，说明原因并停止。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "规格文档:",
        spec,
        "",
        "最终规划:",
        plan,
        "",
        fileContext ? `项目文件上下文:\n${fileContext}\n` : "",
        "用户需求:",
        requirement,
      ].join("\n"),
    },
  ];

  return askAIModel(messages);
}

export async function handleSpecFlow(requirement, attachedFiles) {
  const spec = await ensureSpecFile();
  const planning = await updateSpecAndPlan(requirement, spec, attachedFiles);
  const updatedSpec = planning.spec || spec;

  await writeFile(specPath, updatedSpec, "utf8");

  if (planning.issues && planning.issues !== "无") {
    return [
      "规划阶段发现问题，已先改造规格文档，暂不执行。",
      "",
      planning.issues,
      "",
      planning.plan || planning.raw,
    ].join("\n");
  }

  const review = await validatePlan(
    requirement,
    updatedSpec,
    planning.plan || planning.raw,
  );

  if (review.status !== "pass") {
    if (review.spec) {
      await writeFile(specPath, review.spec, "utf8");
    }

    return [
      "规划审查未通过，已进行二次文档改造，暂不执行。",
      "",
      review.feedback || review.raw,
    ].join("\n");
  }

  return executeSpecPlan(
    requirement,
    updatedSpec,
    planning.plan || planning.raw,
    attachedFiles,
  );
}

export async function handleCommand(
  command,
  message,
  history,
  attachedFiles,
  saveHistory,
  selectCommand,
  selectFile,
) {
  if (command === "/exit") {
    console.log("");
    const saveSpinner = ora({
      text: "正在保存对话历史...",
      color: "yellow",
    }).start();

    try {
      await saveHistory(history);
      saveSpinner.succeed();
      logger.log("已退出，欢迎下次继续。", "green");
    } catch (error) {
      saveSpinner.fail();
      logger.log(`退出时保存历史失败: ${error.message}`, "red");
    }

    console.log("");
    return { exit: true };
  }

  if (command === "/help") {
    renderHelp();
    return { exit: false };
  }

  if (command === "/context") {
    console.log("");
    logger.log(
      `当前上下文共 ${history.length} 条消息，待发送文件 ${attachedFiles.length} 个。`,
      "blue",
    );
    console.log("");
    return { exit: false };
  }

  if (command === "/clear") {
    history.length = 0;
    attachedFiles.length = 0;
    console.log("");
    logger.log("当前对话上下文和文件附件已清空。", "yellow");
    console.log("");
    return { exit: false };
  }

  const isSpecCommand = message.startsWith("/spec ");
  const promptText = isSpecCommand ? extractSpecRequest(message) : message;

  if (command === "/spec" && !isSpecCommand) {
    logger.log(
      "请使用 /spec 加上需求，例如: /spec 增加文件选择上下文能力",
      "yellow",
    );
    return { exit: false };
  }

  console.log("");
  const spinner = ora({
    text: isSpecCommand ? "正在更新规格文档并审查规划..." : "思考中...",
    color: "cyan",
  }).start();

  try {
    const reply = isSpecCommand
      ? await handleSpecFlow(promptText, attachedFiles)
      : await askAIModel([
          ...history,
          {
            role: "user",
            content: buildUserMessage(promptText, attachedFiles),
          },
        ]);

    history.push({
      role: "user",
      content: buildUserMessage(promptText, attachedFiles),
    });
    history.push({ role: "assistant", content: reply });
    attachedFiles.length = 0;

    spinner.succeed();
    console.log("");
    logger.log("助手 > ", "green");
    logger.logmarkdown(reply);
  } catch (error) {
    spinner.fail();
    console.log("");
    logger.log(`请求失败: ${error.message}`, "red");
  }

  console.log("");
  return { exit: false };
}

export async function chooseFileAttachment(message, attachedFiles) {
  const file = await selectFile(message, { projectRoot });
  attachedFiles.push(file);
  logger.log(`已选择文件: ${file.path}`, "green");
  logger.log(
    `当前待发送文件上下文: ${attachedFiles.length} 个。请输入问题后再请求模型。`,
    "gray",
  );
}
