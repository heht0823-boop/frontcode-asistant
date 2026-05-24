/**
 * 上下文读取工具模块
 * 提供系统文档和用户上下文的读取及占位符替换功能
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getProjectRoot() {
  return join(__dirname, "..", "..");
}

/**
 * 读取系统文档并替换占位符（同步版本）
 * @returns {string} 替换后的系统文档内容
 */
export function readSystem() {
  const projectRoot = getProjectRoot();
  const systemDocPath = join(projectRoot, "src", "docs", "systemDoc.md");

  try {
    const content = readFileSync(systemDocPath, "utf-8");
    const systemInfo = `${os.type()} ${os.release()} (${os.platform()})`;
    const workPath = projectRoot;

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
 * @returns {string} 替换后的用户上下文内容，若无文件则返回空字符串
 */
export function getUserContext() {
  const projectRoot = getProjectRoot();

  const userFrontPath = join(projectRoot, "src", ".front", "front.md");
  const projectFrontPath = join(projectRoot, "front.md");

  let userContent = "";
  if (existsSync(userFrontPath)) {
    try {
      userContent = readFileSync(userFrontPath, "utf-8");
    } catch (error) {
      console.error(`读取 src/.front/front.md 失败: ${error.message}`);
      userContent = "";
    }
  }

  let projectContent = "";
  if (existsSync(projectFrontPath)) {
    try {
      projectContent = readFileSync(projectFrontPath, "utf-8");
    } catch (error) {
      console.error(`读取项目根目录 front.md 失败: ${error.message}`);
      projectContent = "";
    }
  }

  if (!userContent && !projectContent) {
    return "";
  }

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
    template =
      "用户额外有以下要求，当你回答问题的时候，请参考\n[${userPath}]${userContent}\n[${projectPath}]${projectContent}";
  }

  let result = template
    .replace(/\${userPath}/g, userContent ? userFrontPath : "")
    .replace(/\${userContent}/g, userContent)
    .replace(/\${projectPath}/g, projectContent ? projectFrontPath : "")
    .replace(/\${projectContent}/g, projectContent);

  result = result
    .split("\n")
    .filter((line) => line.trim() !== "")
    .join("\n");

  return result;
}

/**
 * 从规则文件内容中解析 YAML frontmatter 中的触发规则
 * @param {string} content - 规则文件内容
 * @returns {Array<string>} 触发规则数组
 */
function parseRulesFromContent(content) {
  const rules = [];

  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (match && match[1]) {
    const frontmatter = match[1];
    const pathsRegex = /paths:\s*\n((?:\s*-\s*.+\n?)+)/;
    const pathsMatch = frontmatter.match(pathsRegex);

    if (pathsMatch && pathsMatch[1]) {
      const pathItems = pathsMatch[1].match(/-\s*(.+)/g);
      if (pathItems) {
        for (const item of pathItems) {
          let path = item.replace(/-\s*/, "").trim();
          path = path.replace(/^["']|["']$/g, "");
          if (path) {
            rules.push(path);
          }
        }
      }
    }
  }

  return rules;
}

/**
 * 读取目录下所有文件并添加到 Map 中
 * @param {string} dirPath - 目录路径
 * @param {Map} rulesMap - 规则缓存 Map
 */
function readRulesFromDir(dirPath, rulesMap) {
  if (!existsSync(dirPath)) {
    return;
  }

  try {
    const files = readdirSync(dirPath);
    for (const file of files) {
      const filePath = join(dirPath, file);
      try {
        const stat = statSync(filePath);
        if (stat.isFile()) {
          const content = readFileSync(filePath, "utf-8");
          const rules = parseRulesFromContent(content);
          rulesMap.set(filePath, {
            content,
            rules,
          });
        }
      } catch (error) {
        console.error(`读取规则文件失败 ${filePath}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`读取规则目录失败 ${dirPath}: ${error.message}`);
  }
}

/**
 * 读取规则文件
 * @returns {Map} 规则缓存 Map
 */
export function readRules() {
  const projectRoot = getProjectRoot();
  const rulesMap = new Map();

  const srcRulesPath = join(projectRoot, "src", ".front", "rules");
  const projectRulesPath = join(projectRoot, "front", "rules");

  readRulesFromDir(srcRulesPath, rulesMap);
  readRulesFromDir(projectRulesPath, rulesMap);

  return rulesMap;
}

/**
 * 将 glob 模式转换为正则表达式
 * @param {string} pattern - glob 模式
 * @returns {RegExp} 正则表达式
 */
function globToRegex(pattern) {
  let regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{DOUBLESTAR\}\}/g, ".*")
    .replace(/\?/g, ".");

  return new RegExp("^" + regexStr + "$");
}

/**
 * 匹配文件路径与规则
 * @param {string} filePath - 文件路径
 * @param {Array<string>} rules - glob 规则数组
 * @returns {boolean} 是否匹配
 */
function matchPathAgainstRules(filePath, rules) {
  const normalizedPath = filePath.replace(/\\/g, "/");

  for (const rule of rules) {
    const regex = globToRegex(rule);
    if (regex.test(normalizedPath)) {
      return true;
    }
  }
  return false;
}

/**
 * 根据文件路径匹配规则，返回匹配到的规则内容
 * @param {string} filePath - 文件绝对路径
 * @param {Map} rulesMap - 规则缓存 Map
 * @returns {string} 匹配到的规则内容，如果没有匹配则返回空字符串
 */
export function matchRulesForFile(filePath, rulesMap) {
  const normalizedPath = filePath.replace(/\\/g, "/");

  for (const [rulePath, ruleData] of rulesMap) {
    if (matchPathAgainstRules(normalizedPath, ruleData.rules)) {
      return ruleData.content;
    }
  }
  return "";
}
