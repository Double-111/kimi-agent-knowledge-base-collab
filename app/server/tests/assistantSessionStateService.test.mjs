import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";

import { AssistantSessionStateService } from "../services/assistantSessionStateService.mjs";

test("AssistantSessionStateService returns an empty state before any save", async () => {
  const runtimeRoot = await mkdtemp(path.join(os.tmpdir(), "assistant-session-state-"));
  const service = new AssistantSessionStateService({ runtimeRoot });

  const state = await service.load();

  assert.deepEqual(state, {
    sessions: [],
    activeSessionId: "",
    businessPrompt: "",
    modelName: "gpt-4.1-mini",
  });
});

test("AssistantSessionStateService persists frontend chat sessions", async () => {
  const runtimeRoot = await mkdtemp(path.join(os.tmpdir(), "assistant-session-state-save-"));
  const service = new AssistantSessionStateService({ runtimeRoot });

  await service.save({
    sessions: [
      {
        id: "session-1",
        title: "测试会话",
        draftQuestion: "草稿问题",
        messages: [
          {
            id: "message-1",
            question: "什么是本体论？",
            answer: "关于存在者及其关系的结构化描述。",
            relatedNames: ["形式本体论"],
            toolRuns: [],
          },
        ],
        error: "ignored",
        loading: true,
        statusMessage: "ignored",
      },
    ],
    activeSessionId: "session-1",
    businessPrompt: "请优先使用知识库术语回答。",
    modelName: "gpt-4.1",
  });

  const state = await service.load();

  assert.deepEqual(state, {
    sessions: [
      {
        id: "session-1",
        title: "测试会话",
        draftQuestion: "草稿问题",
        messages: [
          {
            id: "message-1",
            question: "什么是本体论？",
            answer: "关于存在者及其关系的结构化描述。",
            relatedNames: ["形式本体论"],
            toolRuns: [],
          },
        ],
        error: null,
        loading: false,
        statusMessage: null,
      },
    ],
    activeSessionId: "session-1",
    businessPrompt: "请优先使用知识库术语回答。",
    modelName: "gpt-4.1",
  });
});
