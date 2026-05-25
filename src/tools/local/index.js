/**
 * 本地工具入口。
 * 统一注册项目内置工具，并输出工具定义与名称映射。
 */
import LocalClient from "./LocalClient.js";
import bash from "./bash.js";
import confirm from "./confirm.js";
import glob from "./glob.js";
import grep from "./grep.js";
import readFileTool from "./read_file.js";
import select from "./select.js";
import skill from "./skill.js";
import writeFileTool from "./write_file.js";

/** 项目内置工具列表 */
const localToolModules = [
  skill,
  bash,
  grep,
  readFileTool,
  writeFileTool,
  glob,
  confirm,
  select,
];

/**
 * 创建本地工具客户端、工具定义和工具名映射。
 * @returns {{localTools: Array<Object>, localMap: Object}} 本地工具定义和调用映射
 */
export default function getLocalTool() {
  const localClient = new LocalClient();

  localToolModules.forEach((tool) => localClient.registerTool(tool));

  const localTools = localClient.listTools();
  const localMap = {};

  localTools.tools.forEach((tool) => {
    localMap[tool.name] = localClient;
  });

  return {
    localTools: localTools.tools,
    localMap,
  };
}
