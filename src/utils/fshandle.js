import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { getCurrentWorkingDir } from "./pathUtils.js";

const FRONT_DIR = join(getCurrentWorkingDir(), "src", ".front", "userHistory");
const HISTORY_FILE = join(FRONT_DIR, "userHistory.json");

/**
 * 确保 .front 目录存在
 */
async function ensureDirExists() {
  await mkdir(FRONT_DIR, { recursive: true });
}

/**
 * 保存对话历史到文件
 * @param {Array<Object>} history - 对话历史记录
 */
export async function saveHistory(history) {
  await ensureDirExists();
  const data = {
    history,
    timestamp: new Date().toISOString(),
  };
  await writeFile(HISTORY_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * 读取对话历史
 * @returns {Array<Object>} 对话历史记录
 */
export async function loadHistory() {
  try {
    const data = await readFile(HISTORY_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return parsed.history || [];
  } catch {
    return [];
  }
}

/**
 * 清空对话历史
 */
export async function clearHistory() {
  await ensureDirExists();
  await writeFile(
    HISTORY_FILE,
    JSON.stringify({ history: [], timestamp: new Date().toISOString() }),
    "utf-8",
  );
}

/**
 * 获取历史记录文件路径
 * @returns {string} 历史记录文件路径
 */
export function getHistoryFilePath() {
  return HISTORY_FILE;
}
