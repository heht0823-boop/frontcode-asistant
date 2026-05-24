/**
 * 上下文读取工具模块
 * 提供系统文档读取和占位符替换功能
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

// 获取当前文件的目录路径（ESM 兼容方式）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 读取系统文档并替换占位符
 * 
 * 支持的占位符：
 * - ${systemInfo} - 操作系统信息
 * - ${workPath} - 当前项目根目录路径
 * 
 * @returns {string} 替换后的系统文档内容
 */
export async function readSystem() {
  // 从当前文件所在目录向上两级找到项目根目录
  const projectRoot = join(__dirname, "..", "..");
  const systemDocPath = join(projectRoot, "src", "docs", "systemDoc.md");

  try {
    // 读取系统文档内容
    const content = await readFile(systemDocPath, "utf-8");

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

// 测试代码（仅在直接运行当前文件时执行）
if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    const result = await readSystem();
    console.log(result);
  }
}
