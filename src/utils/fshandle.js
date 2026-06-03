/**
 * 文件操作工具模块
 * 提供对话历史的保存、读取和管理功能
 */
import { writeFile, readFile, mkdir } from "fs/promises";
import { basename, join } from "path";
import { getCurrentWorkingDir, getUserHomeDir } from "./pathUtils.js";

/** 历史记录目录路径 */
const FRONT_DIR = join(getCurrentWorkingDir(), "src", ".front", "userHistory");

/** 历史记录文件路径 */
const HISTORY_FILE = join(FRONT_DIR, "userHistory.json");

/** 用户目录下按项目归档的历史记录目录 */
const ARCHIVE_HISTORY_DIR = join(
  getUserHomeDir(),
  ".front",
  "history",
  basename(getCurrentWorkingDir()),
);

/**
 * 确保历史记录目录存在
 */
async function ensureDirExists() {
  await mkdir(FRONT_DIR, { recursive: true });
  await mkdir(ARCHIVE_HISTORY_DIR, { recursive: true });
}

/**
 * 保存对话历史到文件
 * @param {Array<Object>} history - 对话历史记录数组
 * @returns {Promise<void>}
 */
export async function saveHistory(history) {
  await ensureDirExists();
  const timestamp = new Date().toISOString();
  const data = {
    history,
    timestamp,
  };

  await writeFile(HISTORY_FILE, JSON.stringify(data, null, 2), "utf-8");

  if (history.length > 0) {
    const archivePath = join(
      ARCHIVE_HISTORY_DIR,
      `${Date.parse(timestamp)}.json`,
    );
    await writeFile(archivePath, JSON.stringify(history, null, 2), "utf-8");
  }
}

/**
 * 读取对话历史
 * @returns {Promise<Array<Object>>} 对话历史记录数组
 */
export async function loadHistory() {
  try {
    const data = await readFile(HISTORY_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return parsed.history || [];
  } catch {
    // 文件不存在或读取失败，返回空数组
    return [];
  }
}

/**
 * 清空对话历史
 * @returns {Promise<void>}
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
 * @returns {string} 历史记录文件的完整路径
 */
export function getHistoryFilePath() {
  return HISTORY_FILE;
}
