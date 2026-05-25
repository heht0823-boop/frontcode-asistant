import fs from "fs";
import path from "path";
import { getUserHomeDir, getCurrentWorkingDir } from "../../utils/pathUtils.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** 支持的 Streamable HTTP 类型别名 */
const streamableHttpTypes = new Set(["http", "streamablehttp"]);

/**
 * 安全读取 MCP 配置文件。
 * @param {string} dir - 配置所在的基础目录
 * @returns {Object} MCP 服务配置对象
 */
function readMcpConfigFromDir(dir) {
  const configPath = path.join(dir, ".front", "settings.json");

  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }

    const content = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);

    return config.mcpServer || config.mcpServers || {};
  } catch (error) {
    console.warn(`读取 MCP 配置失败 ${configPath}: ${error.message}`);
    return {};
  }
}

/**
 * 获取 MCP 配置。
 * 从用户目录和项目目录读取 .front/settings.json 配置文件并合并。
 * @returns {Array<Object>} 合并后的 MCP 服务器配置数组
 */
export function getMcpConfig() {
  const userConfig = readMcpConfigFromDir(getUserHomeDir());
  const projectConfig = readMcpConfigFromDir(getCurrentWorkingDir());

  // 合并配置，项目配置优先覆盖用户配置。
  const mergedConfig = { ...userConfig, ...projectConfig };

  return Object.entries(mergedConfig).map(([name, server]) => ({
    ...server,
    name,
  }));
}

/**
 * 根据 MCP 服务配置创建传输层。
 * @param {Object} mcpServer - MCP 服务配置
 * @returns {StdioClientTransport|SSEClientTransport|StreamableHTTPClientTransport|null} MCP 传输层
 */
function createTransport(mcpServer) {
  const { type, url, headers = {}, command, args = [], env = {} } = mcpServer;

  if (streamableHttpTypes.has(type)) {
    return new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers },
    });
  }

  if (type === "sse") {
    return new SSEClientTransport(new URL(url), {
      requestInit: { headers },
    });
  }

  if (type === "stdio") {
    return new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...env },
    });
  }

  return null;
}

/**
 * 连接所有 MCP 服务并获取工具列表。
 * 每个工具名称会加上服务名前缀，方便通过工具名找到对应的客户端。
 * @param {Array<Object>} targetList - 需要追加工具定义的数组
 * @param {Object} targetMap - 需要追加工具调用器的映射
 * @returns {Promise<Array<string>>} 连接失败或配置错误的提示列表
 */
export async function linkMcpAndListTool(targetList, targetMap) {
  const errors = [];
  const mcpList = getMcpConfig();

  for (const mcpServer of mcpList) {
    const { name } = mcpServer;

    try {
      const client = new Client({
        name: "frontcode-mcp-client",
        version: "1.0.0",
      });

      const transport = createTransport(mcpServer);

      if (!transport) {
        errors.push(`MCP 服务 ${name} 的 type 不受支持，已跳过。`);
        continue;
      }

      await client.connect(transport);
      const mcpTools = await client.listTools();

      for (const tool of mcpTools.tools) {
        const prefixedToolName = `${name}__${tool.name}`;

        targetList.push({
          ...tool,
          name: prefixedToolName,
        });

        // OpenAI 侧使用带前缀的名称，真正调用 MCP 时还原为服务内原始工具名。
        targetMap[prefixedToolName] = {
          callTool({ arguments: args }) {
            return client.callTool({
              name: tool.name,
              arguments: args,
            });
          },
        };
      }
    } catch (error) {
      errors.push(`MCP 服务 ${name} 连接失败: ${error.message}`);
    }
  }

  return errors;
}
