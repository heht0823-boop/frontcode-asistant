/**
 * 记忆工具模块。
 * 负责读取项目级/用户级记忆、上下文和历史记录，并生成记忆提示词。
 */
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

/** 当前模块目录 */
const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * 确保文件存在，若不存在则创建空文件。
 * @param {string} filePath - 文件路径
 * @returns {string} 文件内容
 */
function readOrCreateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "", "utf-8");
    return "";
  }

  return fs.readFileSync(filePath, "utf-8");
}

/**
 * 获取项目级和用户级记忆文件路径。
 * @returns {{projectMemory: string, userMemory: string}} 记忆文件路径
 */
export function getMemoryPaths() {
  return {
    projectMemory: path.join(process.cwd(), ".front", "memory", "memory.md"),
    userMemory: path.join(os.homedir(), ".front", "memory", "memory.md"),
  };
}

/**
 * 获取当前项目和用户目录下的 memory.md 内容并合并。
 * @returns {{projectMemory: string, userMemory: string}} 合并后的记忆对象
 */
export function getNowMemory() {
  const memoryPaths = getMemoryPaths();

  return {
    projectMemory: readOrCreateFile(memoryPaths.projectMemory),
    userMemory: readOrCreateFile(memoryPaths.userMemory),
  };
}

/**
 * 获取当前项目的历史对话记录。
 * @param {number} [maxCount=50] - 最大获取的历史记录条数
 * @returns {Array<Object>} 历史记录数组
 */
export function getHistory(maxCount = 50) {
  const userDir = os.homedir();
  const projectName = path.basename(process.cwd());
  const projectHistoryDir = path.join(userDir, ".front", "history", projectName);

  if (!fs.existsSync(projectHistoryDir)) {
    return [];
  }

  const files = fs
    .readdirSync(projectHistoryDir)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => {
      const tsA = Number.parseInt(path.basename(a, ".json"), 10);
      const tsB = Number.parseInt(path.basename(b, ".json"), 10);
      return tsB - tsA;
    });

  const result = [];

  for (const file of files) {
    const filePath = path.join(projectHistoryDir, file);

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const records = JSON.parse(content);

      if (Array.isArray(records)) {
        result.push(...records);
      }

      if (result.length >= maxCount) {
        return result.slice(0, maxCount);
      }
    } catch (error) {
      console.error(`读取历史记录文件失败 ${filePath}: ${error.message}`);
    }
  }

  return result;
}

/**
 * 获取当前项目和用户目录下的 .front.md 内容并合并。
 * @returns {{projectContext: string, userContext: string}} 合并后的上下文对象
 */
export function getContext() {
  const contextPaths = {
    projectContext: path.join(process.cwd(), ".front.md"),
    userContext: path.join(os.homedir(), ".front", ".front.md"),
  };

  return {
    projectContext: readOrCreateFile(contextPaths.projectContext),
    userContext: readOrCreateFile(contextPaths.userContext),
  };
}

/**
 * 读取模板并替换占位符，生成完整的记忆提示内容。
 * @returns {string} 替换后的模板文本
 */
export function getMemoryContent() {
  const templatePath = path.join(currentDir, "..", "docs", "memoryTemplate.md");
  let template = fs.readFileSync(templatePath, "utf-8");

  const { projectMemory, userMemory } = getNowMemory();
  const { projectContext, userContext } = getContext();
  const history = getHistory();

  template = template.replace(/\$\{projectMeory\}/g, projectMemory);
  template = template.replace(/\$\{userMeory\}/g, userMemory);
  template = template.replace(/\$\{projectMd\}/g, projectContext);
  template = template.replace(/\$\{userMd\}/g, userContext);
  template = template.replace(/\$\{record\}/g, JSON.stringify(history, null, 2));

  return template;
}
