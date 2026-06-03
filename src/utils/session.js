/**
 * 会话状态模块。
 * 集中管理当前终端会话中的历史记录、附件文件和运行时配置。
 */

/**
 * 创建会话状态对象。
 * @param {Object} options - 会话初始化选项
 * @param {Array<Object>} [options.history=[]] - 初始对话历史
 * @param {string} options.systemPrompt - 系统提示词
 * @param {string} options.userContext - 用户上下文
 * @param {Map<string, Object>} options.rules - 文件匹配规则
 * @param {Object} options.config - 应用配置
 * @returns {{history: Array<Object>, attachedFiles: Array<Object>, systemPrompt: string, userContext: string, rules: Map<string, Object>, config: Object}} 会话状态
 */
export function createSessionState({
  history = [],
  systemPrompt,
  userContext,
  rules,
  config,
}) {
  return {
    history,
    attachedFiles: [],
    systemPrompt,
    userContext,
    rules,
    config,
  };
}

/**
 * 清空会话上下文。
 * @param {{history: Array<Object>, attachedFiles: Array<Object>}} session - 会话状态
 * @returns {void}
 */
export function clearSession(session) {
  session.history.length = 0;
  session.attachedFiles.length = 0;
}

/**
 * 清空已选择的附件文件。
 * @param {{attachedFiles: Array<Object>}} session - 会话状态
 * @returns {void}
 */
export function clearAttachments(session) {
  session.attachedFiles.length = 0;
}
