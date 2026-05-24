/**
 * 上下文读取工具模块
 * 提供系统文档和用户上下文的读取及占位符替换功能
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

// 获取当前文件的目录路径（ESM 兼容方式）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 获取项目根目录路径
 * @returns {string} 项目根目录的绝对路径
 */
function getProjectRoot() {
  return join(__dirname, "..", "..");
}

/**
 * 读取系统文档并替换占位符（同步版本）
 *
 * 支持的占位符：
 * - ${systemInfo} - 操作系统信息
 * - ${workPath} - 当前项目根目录路径
 *
 * @returns {string} 替换后的系统文档内容
 */
export function readSystem() {
  const projectRoot = getProjectRoot();
  const systemDocPath = join(projectRoot, "src", "docs", "systemDoc.md");

  try {
    // 读取系统文档内容（同步方式）
    const content = readFileSync(systemDocPath, "utf-8");

    // 获取系统信息（操作系统类型、版本、平台）
    const systemInfo = `${os.type()} ${os.release()} (${os.platform()})`;

    // 获取工作目录（项目根目录的绝对路径）
    const workPath = projectRoot;

    // 替换占位符（全局替换）
    let result = content.replace(/\${systemInfo}/g, systemInfo);
    result = result.replace(/\${workPath}/g, workPath);

    return result;
  } catch (error) {
    console.error(`读取系统文档失败: ${error.message}`);
    return "";
  }
}

/**
 * 读取用户上下文文档
 *
 * 文件映射关系：
 * - src/.front/front.md → ${userPath} 和 ${userContent}
 * - 项目根目录下的 front.md → ${projectPath} 和 ${projectContent}
 *
 * 支持的占位符：
 * - ${userPath} - src/.front/front.md 的路径
 * - ${userContent} - src/.front/front.md 的内容
 * - ${projectPath} - 项目根目录下 front.md 的路径
 * - ${projectContent} - 项目根目录下 front.md 的内容
 *
 * @returns {string} 替换后的用户上下文内容，若无文件则返回空字符串
 */
export function getUserContext() {
  const projectRoot = getProjectRoot();

  // src/.front/front.md 路径（映射到 userPath/userContent）
  const userFrontPath = join(projectRoot, "src", ".front", "front.md");
  // 项目根目录下的 front.md 路径（映射到 projectPath/projectContent）
  const projectFrontPath = join(projectRoot, "front.md");

  // src/.front/front.md 的内容
  let userContent = "";
  if (existsSync(userFrontPath)) {
    try {
      userContent = readFileSync(userFrontPath, "utf-8");
    } catch (error) {
      console.error(`读取 src/.front/front.md 失败: ${error.message}`);
      userContent = "";
    }
  }

  // 项目根目录下 front.md 的内容
  let projectContent = "";
  if (existsSync(projectFrontPath)) {
    try {
      projectContent = readFileSync(projectFrontPath, "utf-8");
    } catch (error) {
      console.error(`读取项目根目录 front.md 失败: ${error.message}`);
      projectContent = "";
    }
  }

  // 如果两个文件都不存在，返回空字符串
  if (!userContent && !projectContent) {
    return "";
  }

  // 读取用户上下文模板
  const userContextTemplatePath = join(
    projectRoot,
    "src",
    "docs",
    "userContext.md",
  );

  let template = "";
  try {
    template = readFileSync(userContextTemplatePath, "utf-8");
  } catch (error) {
    console.error(`读取用户上下文模板失败: ${error.message}`);
    // 如果模板文件不存在，使用默认格式
    template =
      "用户额外有以下要求，当你回答问题的时候，请参考\n[${userPath}]${userContent}\n[${projectPath}]${projectContent}";
  }

  // 替换占位符
  let result = template
    .replace(/\${userPath}/g, userContent ? userFrontPath : "")
    .replace(/\${userContent}/g, userContent)
    .replace(/\${projectPath}/g, projectContent ? projectFrontPath : "")
    .replace(/\${projectContent}/g, projectContent);

  // 清理空行
  result = result
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");

  return result;
}

// 测试代码（仅在直接运行当前文件时执行）
if (import.meta.url.startsWith("file:")) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    console.log(getUserContext());
  }
}
