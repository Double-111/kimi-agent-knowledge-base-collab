import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function emptyState() {
  return {
    sessions: [],
    activeSessionId: "",
    businessPrompt: "",
    modelName: "gpt-4.1-mini",
  };
}

function normalizeToolRun(value) {
  const raw = asObject(value);
  if (!raw) {
    return null;
  }

  return {
    callId: typeof raw.callId === "string" ? raw.callId : "",
    command: typeof raw.command === "string" ? raw.command : "",
    status: typeof raw.status === "string" ? raw.status : "cancelled",
    stdout: typeof raw.stdout === "string" ? raw.stdout : "",
    stderr: typeof raw.stderr === "string" ? raw.stderr : "",
    exitCode: typeof raw.exitCode === "number" ? raw.exitCode : null,
    cwd: typeof raw.cwd === "string" ? raw.cwd : null,
    durationMs: typeof raw.durationMs === "number" ? raw.durationMs : null,
    truncated: Boolean(raw.truncated),
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : null,
    finishedAt: typeof raw.finishedAt === "string" ? raw.finishedAt : null,
  };
}

function normalizeMessage(value) {
  const raw = asObject(value);
  if (!raw) {
    return null;
  }

  return {
    id: typeof raw.id === "string" ? raw.id : "",
    question: typeof raw.question === "string" ? raw.question : "",
    answer: typeof raw.answer === "string" ? raw.answer : "",
    relatedNames: Array.isArray(raw.relatedNames)
      ? raw.relatedNames.filter((item) => typeof item === "string")
      : [],
    toolRuns: Array.isArray(raw.toolRuns)
      ? raw.toolRuns.map(normalizeToolRun).filter(Boolean)
      : [],
  };
}

function normalizeSession(value) {
  const raw = asObject(value);
  if (!raw) {
    return null;
  }

  return {
    id: typeof raw.id === "string" ? raw.id : "",
    title: typeof raw.title === "string" ? raw.title : "",
    draftQuestion: typeof raw.draftQuestion === "string" ? raw.draftQuestion : "",
    messages: Array.isArray(raw.messages)
      ? raw.messages.map(normalizeMessage).filter(Boolean)
      : [],
    error: null,
    loading: false,
    statusMessage: null,
  };
}

function normalizeState(value) {
  const raw = asObject(value);
  if (!raw) {
    return emptyState();
  }

  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.map(normalizeSession).filter(Boolean)
    : [];
  const activeSessionId = typeof raw.activeSessionId === "string" ? raw.activeSessionId : "";
  const businessPrompt = typeof raw.businessPrompt === "string" ? raw.businessPrompt : "";
  const modelName = typeof raw.modelName === "string" && raw.modelName.trim()
    ? raw.modelName.trim()
    : "gpt-4.1-mini";

  return {
    sessions,
    activeSessionId,
    businessPrompt,
    modelName,
  };
}

export class AssistantSessionStateService {
  constructor(options) {
    this.statePath = path.join(
      options.runtimeRoot,
      ".agent",
      "web-chat-state.json",
    );
  }

  async load() {
    await this.ensureStorageDir();

    try {
      const content = await readFile(this.statePath, "utf8");
      return normalizeState(JSON.parse(content));
    } catch (error) {
      if (error?.code === "ENOENT") {
        return emptyState();
      }
      throw error;
    }
  }

  async save(input) {
    await this.ensureStorageDir();
    const normalized = normalizeState(input);
    await writeFile(
      this.statePath,
      JSON.stringify({
        version: 1,
        ...normalized,
      }, null, 2),
      "utf8",
    );
    return normalized;
  }

  async ensureStorageDir() {
    await mkdir(path.dirname(this.statePath), { recursive: true });
  }
}
