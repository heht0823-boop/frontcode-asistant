import os from "os";

/**
 * 获取用户主目录路径
 * @returns {string} 用户主目录的绝对路径，如 Windows 下的 C:\Users\<用户名>
 */
export function getUserHomeDir() {
  return os.homedir();
}

/**
 * 获取当前工作目录路径
 * @returns {string} 当前终端所在目录的绝对路径
 */
export function getCurrentWorkingDir() {
  return process.cwd();
}
