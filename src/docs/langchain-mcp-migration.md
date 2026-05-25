# FrontCode Assistant MCP 两种实现模式改造文档

## 目标

本文档用于帮助你理解当前项目的两种 MCP 工具连接方式：

1. 手写模式：当前项目已经实现，自己连接 MCP、转换工具 schema、处理 tool_calls。
2. LangChain 模式：使用 LangChain 官方 MCP 适配器和 Agent 封装，减少胶水代码。

官方资料入口：

- LangChain JS MCP 文档：https://docs.langchain.com/oss/javascript/langchain/mcp
- LangChain MCP adapters 参考：https://reference.langchain.com/javascript/langchain-mcp-adapters
- LangChain ChatOpenAI 文档：https://docs.langchain.com/oss/javascript/integrations/chat/openai

## 当前手写模式

当前项目的调用链是：

```text
src/app.js
  -> src/commands/index.js
  -> src/request/askAI.js
  -> src/tools/index.js
  -> src/tools/local/*
  -> src/tools/mcp/index.js
```

核心职责拆分如下：

| 模块 | 当前职责 |
| --- | --- |
| `src/request/askAI.js` | 创建 OpenAI 客户端、发送消息、处理模型返回的工具调用 |
| `src/tools/index.js` | 合并本地工具和 MCP 工具，提供统一工具注册表 |
| `src/tools/local/*` | 项目内置工具，例如文件读取、搜索、确认、选择等 |
| `src/tools/mcp/index.js` | 读取 MCP 配置，连接 stdio/sse/http 服务，拉取远程工具 |
| `src/tools/util.js` | 将 MCP 工具定义转换成 OpenAI tools 格式 |

手写模式优点：

- 你能完整理解模型工具调用的底层流程。
- 可控性强，适合学习 OpenAI tools、MCP transport、消息结构。
- 可以按项目需要定制工具名称、错误格式、权限策略。

手写模式缺点：

- 需要自己维护工具调用轮次、异常处理、schema 转换。
- MCP 多服务连接、生命周期、重试、清理逻辑容易变复杂。
- 后续要支持更多模型或 agent 流程时，胶水代码会继续增加。

## LangChain 模式适合解决什么问题

LangChain 模式不是替代你所有代码，而是替代这几块容易重复的逻辑：

- MCP 工具加载与适配。
- 模型绑定工具。
- Agent 循环调用工具并总结结果。
- 后续切换模型、接入 LangGraph 状态流。

建议保留的项目代码：

- `src/app.js` 的终端输入循环。
- `src/commands/index.js` 的命令、附件、spec 流程。
- `src/utils/*` 的配置、日志、文件上下文工具。
- 本地工具的业务逻辑，但需要包装为 LangChain tool。

建议被 LangChain 简化的代码：

- `src/request/askAI.js` 中手动处理 `tool_calls` 的递归逻辑。
- `src/tools/mcp/index.js` 中手写 MCP transport 连接逻辑。
- `src/tools/util.js` 中 MCP schema 转 OpenAI tools 的逻辑。

## 需要安装的依赖

```bash
npm install langchain @langchain/openai @langchain/core @langchain/mcp-adapters zod
```

说明：

- `@langchain/openai`：提供 `ChatOpenAI`。
- `@langchain/mcp-adapters`：把 MCP 服务工具转换为 LangChain tools。
- `langchain`：提供当前官方推荐的 `createAgent`。
- `@langchain/core`：LangChain 核心消息、工具等基础类型。
- `zod`：定义本地工具参数 schema。

## 配置映射建议

你当前 `.front/settings.json` 建议继续使用类似结构：

```json
{
  "mcpServer": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "remote-demo": {
      "type": "streamablehttp",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer xxx"
      }
    }
  }
}
```

LangChain 的 `MultiServerMCPClient` 配置可以由当前配置转换得到：

```js
/**
 * 将项目 MCP 配置转换为 LangChain MCP client 配置。
 * @param {Array<Object>} mcpList - 当前项目读取出的 MCP 配置数组
 * @returns {Object} LangChain MultiServerMCPClient 配置
 */
function toLangChainMcpServers(mcpList) {
  return Object.fromEntries(
    mcpList.map((server) => [
      server.name,
      {
        transport: server.type === "stdio" ? "stdio" : "http",
        command: server.command,
        args: server.args,
        url: server.url,
        headers: server.headers,
      },
    ]),
  );
}
```

## 推荐新增文件结构

```text
src/
  request/
    askAI.js                  # 保留手写模式
    askAI.langchain.js        # 新增 LangChain 模式
  tools/
    langchain/
      localTools.js           # 把本地工具包装成 LangChain tools
      mcpClient.js            # 创建 MultiServerMCPClient
```

这样你可以同时学习两种模式：

- 默认继续走 `askAI.js`。
- 增加环境变量 `AI_RUNTIME=langchain` 后走 `askAI.langchain.js`。

## LangChain MCP 客户端示例

```js
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { getMcpConfig } from "../mcp/index.js";

/**
 * 创建 LangChain MCP 客户端。
 * @returns {MultiServerMCPClient} LangChain MCP 客户端
 */
export function createLangChainMcpClient() {
  const mcpList = getMcpConfig();

  return new MultiServerMCPClient({
    mcpServers: toLangChainMcpServers(mcpList),
  });
}
```

## LangChain Agent 请求层示例

```js
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { loadConfig } from "../../utils/config.js";
import { createLangChainMcpClient } from "../tools/langchain/mcpClient.js";
import { createLocalLangChainTools } from "../tools/langchain/localTools.js";

/**
 * 使用 LangChain Agent 调用模型。
 * @param {Array<Object>} history - 当前 OpenAI 风格历史消息
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userContext - 用户上下文
 * @returns {Promise<string>} 模型最终回复
 */
export async function askAIByLangChain(history, systemPrompt, userContext = "") {
  const config = await loadConfig();
  const mcpClient = createLangChainMcpClient();
  const mcpTools = await mcpClient.getTools();
  const localTools = createLocalLangChainTools();

  const model = new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    configuration: {
      baseURL: config.baseURL,
    },
  });

  const agent = createAgent({
    model,
    tools: [...localTools, ...mcpTools],
  });

  const messages = [
    new SystemMessage(systemPrompt),
    userContext ? new HumanMessage(userContext) : null,
    ...history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
  ].filter(Boolean);

  const result = await agent.invoke({ messages });
  const lastMessage = result.messages.at(-1);

  await mcpClient.close();
  return lastMessage?.content || "模型没有返回文本内容。";
}
```

## 本地工具包装思路

当前本地工具格式是：

```js
{
  define: {
    name: "read_file",
    description: "...",
    inputSchema: {}
  },
  handle(args) {}
}
```

LangChain 工具常用写法是 `tool(fn, { name, description, schema })`。因此可以保留现有 `handle`，只新增一层适配：

```js
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import readFileTool from "../local/read_file.js";

/**
 * 创建 LangChain 本地工具列表。
 * @returns {Array<Object>} LangChain tools
 */
export function createLocalLangChainTools() {
  return [
    tool(
      async (input) => readFileTool.handle(input),
      {
        name: readFileTool.define.name,
        description: readFileTool.define.description,
        schema: z.object({
          file_path: z.string(),
          offset: z.number().optional(),
          limit: z.number().optional(),
        }),
      },
    ),
  ];
}
```

## 分阶段改造路线

### 第 1 阶段：保留手写模式，新增 LangChain 分支

- 新增 `src/request/askAI.langchain.js`。
- 新增 `AI_RUNTIME` 配置。
- 在 `src/request/index.js` 根据配置导出不同请求函数。
- 不删除当前 `askAI.js`，方便对照学习。

### 第 2 阶段：本地工具适配

- 把 `skill/read_file/write_file/glob/grep/confirm/select/bash` 逐个包装成 LangChain tool。
- 优先包装无交互工具：`read_file`、`grep`、`glob`。
- 再处理交互工具：`confirm`、`select`。

### 第 3 阶段：MCP 改为 LangChain adapter

- 用 `MultiServerMCPClient` 替代手写 MCP transport。
- 保留当前 `getMcpConfig()`，只改“连接和转换”部分。
- 对照测试同一个 MCP 服务在两种模式下工具名和参数是否一致。

### 第 4 阶段：清理手写模式或保留双模式

真实开发建议保留双模式一段时间：

- 手写模式用于学习底层和排查工具协议问题。
- LangChain 模式用于日常开发，减少维护成本。

等 LangChain 模式稳定后，再考虑把手写模式移到 `src/request/manual/` 作为教学版本。

## 两种模式对比

| 对比项 | 手写模式 | LangChain 模式 |
| --- | --- | --- |
| 学习价值 | 高，能理解底层 tool_calls | 中，重点在 agent 编排 |
| 代码量 | 多 | 少 |
| 可控性 | 强 | 中等 |
| 接入 MCP | 自己维护 transport | adapter 统一处理 |
| 接入多个模型 | 需要自己适配 | 更方便 |
| 真实项目维护 | 成本更高 | 更适合长期维护 |

## 建议

当前项目最适合采用“双模式并存”的学习路线：

1. 手写模式继续作为主线，理解 OpenAI tools 和 MCP 的底层机制。
2. LangChain 模式作为并行实现，学习真实开发中如何减少重复代码。
3. 每新增一个工具，都先写本地 `handle`，再补一个 LangChain wrapper。
4. 等所有工具都能在 LangChain 模式跑通，再把默认运行模式切到 LangChain。
