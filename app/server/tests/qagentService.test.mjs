import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";

import { QAgentService } from "../services/qagentService.mjs";

function createEmptyContext() {
  return {
    entity: null,
    related: [],
    searchHits: [],
    currentDocument: null,
    relatedDocuments: [],
    searchDocuments: [],
  };
}

test("QAgentService buildPrompt omits hardcoded business prompt by default", () => {
  const service = new QAgentService({
    qagentCommand: [process.execPath, "fake-qagent.mjs"],
    qagentRoot: os.tmpdir(),
    projectRoot: os.tmpdir(),
  });

  const prompt = service.buildPrompt("什么是本体论？", createEmptyContext());

  assert.equal(prompt, "用户问题：什么是本体论？");
  assert.equal(prompt.includes("你是一个本体论知识库助手"), false);
  assert.equal(prompt.includes("当前知识库中没有足够依据"), false);
});

test("QAgentService buildPrompt ignores frontend business prompt when provided", () => {
  const service = new QAgentService({
    qagentCommand: [process.execPath, "fake-qagent.mjs"],
    qagentRoot: os.tmpdir(),
    projectRoot: os.tmpdir(),
  });

  const prompt = service.buildPrompt(
    "什么是本体论？",
    createEmptyContext(),
    { businessPrompt: "请优先基于知识库定义回答。" },
  );

  assert.equal(prompt, "用户问题：什么是本体论？");
});

test("QAgentService buildPrompt includes recent conversation history when provided", () => {
  const service = new QAgentService({
    qagentCommand: [process.execPath, "fake-qagent.mjs"],
    qagentRoot: os.tmpdir(),
    projectRoot: os.tmpdir(),
  });

  const prompt = service.buildPrompt(
    "继续展开一下",
    createEmptyContext(),
    {
      conversationHistory: [
        { question: "先介绍 FJY 目录。", answer: "FJY 里主要有三个项目。" },
        { question: "重点看看 QAgent。", answer: "QAgent 是命令行代理项目。" },
      ],
    },
  );

  assert.equal(prompt.includes("最近对话历史"), true);
  assert.equal(prompt.includes("先介绍 FJY 目录。"), true);
  assert.equal(prompt.includes("QAgent 是命令行代理项目。"), true);
  assert.equal(prompt.endsWith("用户问题：继续展开一下"), true);
});

test("QAgentService writes the selected model into runtime config", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "qagent-service-model-"));
  const runtimeRoot = path.join(tempDir, "runtime");
  const service = new QAgentService({
    qagentCommand: [process.execPath, "fake-qagent.mjs"],
    qagentRoot: tempDir,
    projectRoot: tempDir,
    runtimeRoot,
  });

  await service.ensureRuntimeRoot({ modelName: "gpt-4.1" });

  const config = JSON.parse(
    await readFile(path.join(runtimeRoot, ".agent", "config.json"), "utf8"),
  );

  assert.equal(config.model.model, "gpt-4.1");
});

test("QAgentService can bridge CLI streaming events into deltas and final answer", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "qagent-service-"));
  const cliPath = path.join(tempDir, "fake-qagent.mjs");
  const now = new Date().toISOString();

  await writeFile(
    cliPath,
    `
const isStream = process.argv.includes("--stream");
const successResult = {
  status: "success",
  code: "run.completed",
  exitCode: 0,
  messages: [],
  payload: {
    uiMessages: [
      {
        id: "ui-assistant",
        role: "assistant",
        content: "你好，流式世界",
        createdAt: "${now}",
      }
    ]
  }
};

if (isStream) {
  const events = [
    {
      id: "event-status",
      type: "status.changed",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        status: "running",
        detail: "QAgent 正在思考",
      },
    },
    {
      id: "event-tool-start",
      type: "tool.started",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        toolCall: {
          id: "tool-1",
          name: "shell",
          createdAt: "${now}",
          input: {
            command: "echo hello",
          },
        },
      },
    },
    {
      id: "event-tool-output-stdout",
      type: "tool.output.delta",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        callId: "tool-1",
        command: "echo hello",
        stream: "stdout",
        chunk: "hello\\n",
        cwd: "/tmp/demo",
        startedAt: "${now}",
      },
    },
    {
      id: "event-tool-output-stderr",
      type: "tool.output.delta",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        callId: "tool-1",
        command: "echo hello",
        stream: "stderr",
        chunk: "warn\\n",
        cwd: "/tmp/demo",
        startedAt: "${now}",
      },
    },
    {
      id: "event-tool-finish",
      type: "tool.finished",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        result: {
          callId: "tool-1",
          name: "shell",
          command: "echo hello",
          status: "success",
          exitCode: 0,
          stdout: "hello\\n",
          stderr: "warn\\n",
          cwd: "/tmp/demo",
          durationMs: 12,
          startedAt: "${now}",
          finishedAt: "${now}",
        },
      },
    },
    {
      id: "event-delta-1",
      type: "assistant.delta",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        delta: "你好，",
        text: "你好，",
      },
    },
    {
      id: "event-delta-2",
      type: "assistant.delta",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        delta: "流式世界",
        text: "你好，流式世界",
      },
    },
    {
      id: "event-complete",
      type: "assistant.completed",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        assistantMessageId: "assistant-1",
        content: "你好，流式世界",
        toolCalls: [],
      },
    },
    {
      id: "event-command-complete",
      type: "command.completed",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        domain: "run",
        status: "success",
        code: "run.completed",
        result: successResult,
      },
    },
  ];

  for (const event of events) {
    process.stdout.write(JSON.stringify(event) + "\\n");
  }
} else {
  process.stdout.write(JSON.stringify(successResult));
}
`,
    "utf8",
  );

  const service = new QAgentService({
    qagentCommand: [process.execPath, cliPath],
    qagentRoot: tempDir,
    projectRoot: tempDir,
  });

  const statuses = [];
  const deltas = [];
  const toolStarts = [];
  const toolOutputs = [];
  const toolFinishes = [];
  const result = await service.askStream(
    "请开始流式回答",
    createEmptyContext(),
    {
      onStatus(message) {
        statuses.push(message);
      },
      onAnswerDelta(delta) {
        deltas.push(delta);
      },
      onToolStarted(event) {
        toolStarts.push(event);
      },
      onToolOutput(event) {
        toolOutputs.push(event);
      },
      onToolFinished(event) {
        toolFinishes.push(event);
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.answer, "你好，流式世界");
  assert.deepEqual(deltas, ["你好，", "流式世界"]);
  assert.deepEqual(statuses, ["QAgent 正在思考"]);
  assert.deepEqual(toolStarts, [{
    callId: "tool-1",
    command: "echo hello",
    cwd: null,
    startedAt: now,
  }]);
  assert.deepEqual(toolOutputs, [
    {
      callId: "tool-1",
      command: "echo hello",
      stream: "stdout",
      chunk: "hello\n",
      cwd: "/tmp/demo",
      startedAt: now,
    },
    {
      callId: "tool-1",
      command: "echo hello",
      stream: "stderr",
      chunk: "warn\n",
      cwd: "/tmp/demo",
      startedAt: now,
    },
  ]);
  assert.deepEqual(toolFinishes, [{
    callId: "tool-1",
    command: "echo hello",
    status: "success",
    stdout: "hello\n",
    stderr: "warn\n",
    exitCode: 0,
    cwd: "/tmp/demo",
    durationMs: 12,
    startedAt: now,
    finishedAt: now,
  }]);
});

test("QAgentService answers conversation requests without issuing control commands", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "qagent-service-session-"));
  const cliPath = path.join(tempDir, "fake-qagent.mjs");
  const logPath = path.join(tempDir, "command-log.txt");
  const now = new Date().toISOString();

  await writeFile(
    cliPath,
    `
	import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(logPath)}, args.join(" ") + "\\n");

const commandArgs = args.filter((arg) => arg !== "--json" && arg !== "--stream");
const cwdIndex = commandArgs.indexOf("--cwd");
const normalizedArgs = cwdIndex >= 0
  ? [...commandArgs.slice(0, cwdIndex), ...commandArgs.slice(cwdIndex + 2)]
  : commandArgs;

	const success = (payload = {}) => ({
	  status: "success",
	  code: "ok",
	  exitCode: 0,
	  messages: [],
	  payload,
	});

if (args.includes("--stream")) {
  const events = [
    {
      id: "event-status",
      type: "status.changed",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        status: "running",
        detail: "QAgent 正在思考",
      },
    },
    {
      id: "event-delta",
      type: "assistant.delta",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        delta: "空会话回答",
      },
    },
    {
      id: "event-complete",
      type: "command.completed",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        domain: "run",
        status: "success",
        code: "run.completed",
        result: {
          status: "success",
          code: "run.completed",
          exitCode: 0,
          messages: [],
          payload: {
            uiMessages: [
              {
                id: "ui-assistant",
                role: "assistant",
                content: "空会话回答",
                createdAt: "${now}",
              }
            ]
          }
        },
      },
    },
  ];

  for (const event of events) {
    process.stdout.write(JSON.stringify(event) + "\\n");
  }
  process.exit(0);
}

process.stdout.write(JSON.stringify(success({
  uiMessages: [
    {
      id: "ui-assistant",
      role: "assistant",
      content: "普通回答",
      createdAt: "${now}",
    }
  ]
})));
`,
    "utf8",
  );

  const service = new QAgentService({
    qagentCommand: [process.execPath, cliPath],
    qagentRoot: tempDir,
    projectRoot: tempDir,
  });

  await service.askStream("第一次提问", createEmptyContext(), {}, { conversationId: "session-alpha" });
  await service.askStream("第二次提问", createEmptyContext(), {}, { conversationId: "session-alpha" });

  const commandLog = await readFile(logPath, "utf8");
  assert.equal(commandLog.includes("hook fetch-memory off"), true);
  assert.equal(commandLog.includes("hook save-memory off"), true);
  assert.equal(commandLog.includes("hook auto-compact off"), true);
  assert.equal(/\s(work|session|model)\s/.test(commandLog), false);
});

test("QAgentService ignores persisted workline mappings and answers from an isolated runtime", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "qagent-service-stuck-workline-"));
  const runtimeRoot = path.join(tempDir, "runtime");
  const cliPath = path.join(tempDir, "fake-qagent.mjs");
  const logPath = path.join(tempDir, "command-log.txt");
  const now = new Date().toISOString();
  const stuckWorklineId = "kimi-chat-v2-session-alpha-stuck";

  await writeFile(
    cliPath,
    `
import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(logPath)}, args.join(" ") + "\\n");

const commandArgs = args.filter((arg) => arg !== "--json" && arg !== "--stream");
const cwdIndex = commandArgs.indexOf("--cwd");
const normalizedArgs = cwdIndex >= 0
  ? [...commandArgs.slice(0, cwdIndex), ...commandArgs.slice(cwdIndex + 2)]
  : commandArgs;

const success = (payload = {}) => ({
  status: "success",
  code: "ok",
  exitCode: 0,
  messages: [],
  payload,
});

if (args.includes("--stream")) {
  process.stdout.write(JSON.stringify({
    id: "event-complete",
    type: "command.completed",
    createdAt: "${now}",
    payload: {
      domain: "run",
      status: "success",
      code: "run.completed",
      result: {
        status: "success",
        code: "run.completed",
        exitCode: 0,
        messages: [],
        payload: {
          uiMessages: [
            {
              id: "ui-assistant",
              role: "assistant",
              content: "已恢复新 workline",
              createdAt: "${now}",
            }
          ]
        }
      },
    },
  }) + "\\n");
  process.exit(0);
}

process.stdout.write(JSON.stringify(success()));
`,
    "utf8",
  );

  await mkdir(path.join(runtimeRoot, ".agent", "sessions", "__repo", "heads"), { recursive: true });
  await writeFile(
    path.join(runtimeRoot, ".agent", "web-chat-conversations.json"),
    JSON.stringify({
      version: 2,
      conversations: {
        "session-alpha": {
          worklineId: stuckWorklineId,
          updatedAt: now,
        },
      },
    }, null, 2),
    "utf8",
  );
  await writeFile(
    path.join(runtimeRoot, ".agent", "sessions", "__repo", "heads", `${stuckWorklineId}.json`),
    JSON.stringify({
      id: stuckWorklineId,
      status: "running",
      runtimeState: {
        status: "running",
      },
    }, null, 2),
    "utf8",
  );
  const service = new QAgentService({
    qagentCommand: [process.execPath, cliPath],
    qagentRoot: tempDir,
    projectRoot: tempDir,
    runtimeRoot,
  });

  const result = await service.askStream("帮我继续回答", createEmptyContext(), {}, {
    conversationId: "session-alpha",
  });

  assert.equal(result.ok, true);
  assert.equal(result.answer, "已恢复新 workline");

  const commandLog = await readFile(logPath, "utf8");
  const persistedState = JSON.parse(
    await readFile(path.join(runtimeRoot, ".agent", "web-chat-conversations.json"), "utf8"),
  );

  assert.equal(commandLog.includes(`work switch ${stuckWorklineId}`), false);
  assert.equal(commandLog.includes("work new "), false);
  assert.equal(commandLog.includes("session reset-context"), false);
  assert.deepEqual(persistedState.conversations["session-alpha"], {
    worklineId: stuckWorklineId,
    updatedAt: now,
  });
});

test("QAgentService reports a stream timeout instead of hanging forever", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "qagent-service-timeout-"));
  const cliPath = path.join(tempDir, "fake-qagent.mjs");

  await writeFile(
    cliPath,
    `
const isStream = process.argv.includes("--stream");

if (isStream) {
  process.stdout.write(JSON.stringify({
    id: "event-status",
    type: "status.changed",
    payload: {
      detail: "QAgent 正在慢慢思考",
    },
  }) + "\\n");

  setTimeout(() => {
    process.stdout.write(JSON.stringify({
      id: "event-complete",
      type: "command.completed",
      payload: {
        result: {
          status: "success",
          code: "run.completed",
          exitCode: 0,
          messages: [],
          payload: {
            uiMessages: [
              {
                id: "ui-assistant",
                role: "assistant",
                content: "理论上不该走到这里",
                createdAt: new Date().toISOString(),
              }
            ]
          }
        },
      },
    }) + "\\n");
    process.exit(0);
  }, 1000);
} else {
  process.stdout.write(JSON.stringify({
    status: "success",
    code: "run.completed",
    exitCode: 0,
    messages: [],
    payload: {
      uiMessages: [
        {
          id: "ui-assistant",
          role: "assistant",
          content: "普通回答",
          createdAt: new Date().toISOString(),
        }
      ]
    }
  }));
}
`,
    "utf8",
  );

  const service = new QAgentService({
    qagentCommand: [process.execPath, cliPath],
    qagentRoot: tempDir,
    projectRoot: tempDir,
  });

  const result = await service.askStream(
    "这次请求应该超时",
    createEmptyContext(),
    {},
    { streamTimeoutMs: 50 },
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.includes("已终止本次请求"), true);
});

test("QAgentService can stream without triggering control commands", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "qagent-service-control-timeout-"));
  const cliPath = path.join(tempDir, "fake-qagent.mjs");
  const logPath = path.join(tempDir, "command-log.txt");

  await writeFile(
    cliPath,
    `
import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(logPath)}, args.join(" ") + "\\n");

if (args.includes("--stream")) {
  process.stdout.write(JSON.stringify({
    id: "event-complete",
    type: "command.completed",
    payload: {
      result: {
        status: "success",
        code: "run.completed",
        exitCode: 0,
        messages: [],
        payload: {
          uiMessages: [
            {
              id: "ui-assistant",
              role: "assistant",
              content: "不依赖控制命令也能回答",
              createdAt: new Date().toISOString(),
            }
          ]
        }
      },
    },
  }) + "\\n");
} else {
  process.stdout.write(JSON.stringify({
    status: "success",
    code: "run.completed",
    exitCode: 0,
    messages: [],
    payload: {
      uiMessages: []
    }
  }));
}
`,
    "utf8",
  );

  const service = new QAgentService({
    qagentCommand: [process.execPath, cliPath],
    qagentRoot: tempDir,
    projectRoot: tempDir,
  });

  const result = await service.askStream("这次不该触发控制命令", createEmptyContext(), {}, {
    conversationId: "session-control-timeout",
  });

  const commandLog = await readFile(logPath, "utf8");

  assert.equal(result.ok, true);
  assert.equal(result.answer, "不依赖控制命令也能回答");
  assert.equal(commandLog.includes("hook fetch-memory off"), true);
  assert.equal(commandLog.includes("hook save-memory off"), true);
  assert.equal(commandLog.includes("hook auto-compact off"), true);
  assert.equal(/\b(work|session|model)\b/.test(commandLog), false);
});

test("QAgentService removes persisted workline mappings across service instances", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "qagent-service-persist-"));
  const runtimeRoot = path.join(tempDir, "runtime");
  const cliPath = path.join(tempDir, "fake-qagent.mjs");
  const logPath = path.join(tempDir, "command-log.txt");
  const now = new Date().toISOString();

  await mkdir(path.join(runtimeRoot, ".agent"), { recursive: true });

  await writeFile(
    cliPath,
    `
import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(logPath)}, args.join(" ") + "\\n");

const commandArgs = args.filter((arg) => arg !== "--json" && arg !== "--stream");
const cwdIndex = commandArgs.indexOf("--cwd");
const normalizedArgs = cwdIndex >= 0
  ? [...commandArgs.slice(0, cwdIndex), ...commandArgs.slice(cwdIndex + 2)]
  : commandArgs;

const success = (payload = {}) => ({
  status: "success",
  code: "ok",
  exitCode: 0,
  messages: [],
  payload,
});

if (args.includes("--stream")) {
  const events = [
    {
      id: "event-status",
      type: "status.changed",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        status: "running",
        detail: "QAgent 正在思考",
      },
    },
    {
      id: "event-complete",
      type: "command.completed",
      createdAt: "${now}",
      sessionId: "session-1",
      worklineId: "workline-1",
      executorId: "executor-1",
      headId: "head-1",
      agentId: "agent-1",
      payload: {
        domain: "run",
        status: "success",
        code: "run.completed",
        result: {
          status: "success",
          code: "run.completed",
          exitCode: 0,
          messages: [],
          payload: {
            uiMessages: [
              {
                id: "ui-assistant",
                role: "assistant",
                content: "持久化恢复回答",
                createdAt: "${now}",
              }
            ]
          }
        },
      },
    },
  ];

  for (const event of events) {
    process.stdout.write(JSON.stringify(event) + "\\n");
  }
  process.exit(0);
}

process.stdout.write(JSON.stringify(success()));
`,
    "utf8",
  );

  const firstService = new QAgentService({
    qagentCommand: [process.execPath, cliPath],
    qagentRoot: tempDir,
    projectRoot: tempDir,
    runtimeRoot,
  });

  await writeFile(
    path.join(runtimeRoot, ".agent", "web-chat-conversations.json"),
    JSON.stringify({
      version: 2,
      conversations: {
        "session-persist": {
          worklineId: "kimi-chat-v2-session-persist-stale",
          updatedAt: now,
        },
      },
    }, null, 2),
    "utf8",
  );

  await firstService.askStream("第一次提问", createEmptyContext(), {}, { conversationId: "session-persist" });

  const secondService = new QAgentService({
    qagentCommand: [process.execPath, cliPath],
    qagentRoot: tempDir,
    projectRoot: tempDir,
    runtimeRoot,
  });

  await secondService.askStream("第二次提问", createEmptyContext(), {}, { conversationId: "session-persist" });

  const commandLog = await readFile(logPath, "utf8");
  const persistedState = JSON.parse(await readFile(path.join(runtimeRoot, ".agent", "web-chat-conversations.json"), "utf8"));

  assert.equal(commandLog.includes("work new "), false);
  assert.equal(commandLog.includes("work switch "), false);
  assert.equal(commandLog.includes("session reset-context"), false);
  assert.equal(persistedState.version, 2);
  assert.deepEqual(persistedState.conversations["session-persist"], {
    worklineId: "kimi-chat-v2-session-persist-stale",
    updatedAt: now,
  });
});
