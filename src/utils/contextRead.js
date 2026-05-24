import { readFile } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";

/**
 * 读取系统文档并替换占位符
 * @returns {string} 替换后的系统文档内容
 */
export async function readSystem() {
  const projectRoot = process.cwd();
  const systemDocPath = join(projectRoot, "src", "docs", "systemDoc.md");

  try {
    // 读取系统文档内容
    const content = await readFile(systemDocPath, "utf-8");

    // 获取系统信息
    const systemInfo = `${os.type()} ${os.release()} (${os.platform()})`;

    // 获取工作目录
    const workPath = projectRoot;

    // 替换占位符
    let result = content.replace(/\${systemInfo}/g, systemInfo);
    result = result.replace(/\${workPath}/g, workPath);

    return result;
  } catch (error) {
    console.error(`读取系统文档失败: ${error.message}`);
    return "";
  }
}
