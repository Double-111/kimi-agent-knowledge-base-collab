import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquareText, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  askOntologyAssistantStream,
  fetchOntologyAssistantState,
  saveOntologyAssistantState,
  type OntologyAssistantHistoryTurn,
  type OntologyAssistantToolFinishedEvent,
  type OntologyAssistantToolOutputEvent,
  type OntologyAssistantToolStartedEvent,
} from '@/lib/api';
import type { Entity } from '@/types/ontology';

interface OntologyAssistantProps {
  selectedEntity: Entity | null;
}

interface ConversationMessage {
  id: string;
  question: string;
  answer: string;
  relatedNames: string[];
  toolRuns: ConversationToolRun[];
}

interface ConversationToolRun {
  callId: string;
  command: string;
  status: 'running' | 'success' | 'error' | 'timeout' | 'cancelled' | 'rejected';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  cwd: string | null;
  durationMs: number | null;
  truncated: boolean;
  startedAt: string | null;
  finishedAt: string | null;
}

interface ConversationSession {
  id: string;
  title: string;
  draftQuestion: string;
  messages: ConversationMessage[];
  error: string | null;
  loading: boolean;
  statusMessage: string | null;
}

const TOOL_LOG_LIMIT_BYTES = 8 * 1024;
const ASSISTANT_STATE_STORAGE_KEY = 'ontology-assistant-state-v1';
const DEFAULT_MODEL_NAME = 'gpt-4.1-mini';
const CUSTOM_MODEL_OPTION = '__custom__';
const MODEL_OPTIONS = [
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'o4-mini', label: 'o4-mini' },
];
const toolLogEncoder = new TextEncoder();

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function trimToolLogTail(text: string): { text: string; truncated: boolean } {
  const bytes = toolLogEncoder.encode(text);
  if (bytes.length <= TOOL_LOG_LIMIT_BYTES) {
    return { text, truncated: false };
  }

  const trimmedBytes = bytes.slice(bytes.length - TOOL_LOG_LIMIT_BYTES);
  return {
    text: new TextDecoder().decode(trimmedBytes),
    truncated: true,
  };
}

function createToolRunFromStart(event: OntologyAssistantToolStartedEvent): ConversationToolRun {
  return {
    callId: event.callId,
    command: event.command,
    status: 'running',
    stdout: '',
    stderr: '',
    exitCode: null,
    cwd: event.cwd,
    durationMs: null,
    truncated: false,
    startedAt: event.startedAt,
    finishedAt: null,
  };
}

function applyToolOutputToRun(
  run: ConversationToolRun,
  event: OntologyAssistantToolOutputEvent,
): ConversationToolRun {
  const nextStreamValue = `${event.stream === 'stdout' ? run.stdout : run.stderr}${event.chunk}`;
  const trimmed = trimToolLogTail(nextStreamValue);

  return {
    ...run,
    cwd: event.cwd ?? run.cwd,
    startedAt: event.startedAt ?? run.startedAt,
    stdout: event.stream === 'stdout' ? trimmed.text : run.stdout,
    stderr: event.stream === 'stderr' ? trimmed.text : run.stderr,
    truncated: run.truncated || trimmed.truncated,
  };
}

function applyToolFinishToRun(
  run: ConversationToolRun,
  event: OntologyAssistantToolFinishedEvent,
): ConversationToolRun {
  const trimmedStdout = trimToolLogTail(run.stdout || event.stdout);
  const trimmedStderr = trimToolLogTail(run.stderr || event.stderr);

  return {
    ...run,
    command: event.command,
    status: event.status,
    stdout: trimmedStdout.text,
    stderr: trimmedStderr.text,
    exitCode: event.exitCode,
    cwd: event.cwd,
    durationMs: event.durationMs,
    truncated: run.truncated || trimmedStdout.truncated || trimmedStderr.truncated,
    startedAt: event.startedAt,
    finishedAt: event.finishedAt,
  };
}

function upsertToolRun(
  toolRuns: ConversationToolRun[],
  callId: string,
  createRun: () => ConversationToolRun,
  updateRun: (run: ConversationToolRun) => ConversationToolRun,
): ConversationToolRun[] {
  const existingIndex = toolRuns.findIndex((run) => run.callId === callId);
  if (existingIndex === -1) {
    return [...toolRuns, updateRun(createRun())];
  }

  return toolRuns.map((run, index) => (
    index === existingIndex ? updateRun(run) : run
  ));
}

function createSession(index = 1): ConversationSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `新对话 ${index}`,
    draftQuestion: '',
    messages: [],
    error: null,
    loading: false,
    statusMessage: null,
  };
}

function buildSessionTitle(question: string, fallback: string): string {
  const trimmed = question.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed;
}

function createInitialAssistantState() {
  const session = createSession();
  return {
    sessions: [session],
    activeSessionId: session.id,
    businessPrompt: '',
    modelName: DEFAULT_MODEL_NAME,
  };
}

function getModelPresetValue(modelName: string): string {
  return MODEL_OPTIONS.some((option) => option.value === modelName)
    ? modelName
    : CUSTOM_MODEL_OPTION;
}

function normalizeToolRunStatus(value: unknown): ConversationToolRun['status'] {
  return value === 'success'
    || value === 'error'
    || value === 'timeout'
    || value === 'cancelled'
    || value === 'rejected'
    ? value
    : 'running';
}

function normalizeToolRun(value: unknown, index: number): ConversationToolRun | null {
  const raw = asObject(value);
  if (!raw) {
    return null;
  }

  return {
    callId: typeof raw.callId === 'string' && raw.callId.trim() ? raw.callId : `restored-tool-${index}`,
    command: typeof raw.command === 'string' ? raw.command : '',
    status: normalizeToolRunStatus(raw.status) === 'running' ? 'cancelled' : normalizeToolRunStatus(raw.status),
    stdout: typeof raw.stdout === 'string' ? raw.stdout : '',
    stderr: typeof raw.stderr === 'string' ? raw.stderr : '',
    exitCode: typeof raw.exitCode === 'number' ? raw.exitCode : null,
    cwd: typeof raw.cwd === 'string' ? raw.cwd : null,
    durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : null,
    truncated: Boolean(raw.truncated),
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : null,
    finishedAt: typeof raw.finishedAt === 'string' ? raw.finishedAt : null,
  };
}

function normalizeMessage(value: unknown, index: number): ConversationMessage | null {
  const raw = asObject(value);
  if (!raw) {
    return null;
  }

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `restored-message-${index}`,
    question: typeof raw.question === 'string' ? raw.question : '',
    answer: typeof raw.answer === 'string' ? raw.answer : '',
    relatedNames: Array.isArray(raw.relatedNames)
      ? raw.relatedNames.filter((item): item is string => typeof item === 'string')
      : [],
    toolRuns: Array.isArray(raw.toolRuns)
      ? raw.toolRuns
        .map((item, toolIndex) => normalizeToolRun(item, toolIndex))
        .filter((item): item is ConversationToolRun => Boolean(item))
      : [],
  };
}

function normalizeSession(value: unknown, index: number): ConversationSession | null {
  const raw = asObject(value);
  if (!raw) {
    return null;
  }

  const fallback = createSession(index + 1);
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : fallback.id,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : fallback.title,
    draftQuestion: typeof raw.draftQuestion === 'string' ? raw.draftQuestion : '',
    messages: Array.isArray(raw.messages)
      ? raw.messages
        .map((item, messageIndex) => normalizeMessage(item, messageIndex))
        .filter((item): item is ConversationMessage => Boolean(item))
      : [],
    error: null,
    loading: false,
    statusMessage: null,
  };
}

function normalizeAssistantState(value: unknown) {
  const fallback = createInitialAssistantState();
  const raw = asObject(value);
  if (!raw) {
    return fallback;
  }

  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions
      .map((item, index) => normalizeSession(item, index))
      .filter((item): item is ConversationSession => Boolean(item))
    : [];

  const ensuredSessions = sessions.length > 0 ? sessions : fallback.sessions;
  const requestedActiveSessionId = typeof raw.activeSessionId === 'string' ? raw.activeSessionId : '';
  const activeSessionId = ensuredSessions.some((session) => session.id === requestedActiveSessionId)
    ? requestedActiveSessionId
    : ensuredSessions[0]?.id ?? fallback.activeSessionId;

  return {
    sessions: ensuredSessions,
    activeSessionId,
    businessPrompt: typeof raw.businessPrompt === 'string' ? raw.businessPrompt : '',
    modelName: typeof raw.modelName === 'string' && raw.modelName.trim()
      ? raw.modelName.trim()
      : DEFAULT_MODEL_NAME,
  };
}

function loadCachedAssistantState() {
  if (typeof window === 'undefined') {
    return createInitialAssistantState();
  }

  const raw = window.localStorage.getItem(ASSISTANT_STATE_STORAGE_KEY);
  if (!raw) {
    return createInitialAssistantState();
  }

  try {
    return normalizeAssistantState(JSON.parse(raw));
  } catch {
    return createInitialAssistantState();
  }
}

export function OntologyAssistant({ selectedEntity }: OntologyAssistantProps) {
  const [initialAssistantState] = useState(() => loadCachedAssistantState());
  const [sessions, setSessions] = useState<ConversationSession[]>(initialAssistantState.sessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialAssistantState.activeSessionId);
  const [businessPrompt, setBusinessPrompt] = useState<string>(initialAssistantState.businessPrompt);
  const [modelName, setModelName] = useState<string>(initialAssistantState.modelName);
  const [backendHydrated, setBackendHydrated] = useState(false);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions],
  );

  const examples = selectedEntity
    ? [
        `请解释“${selectedEntity.name}”的定义与本体位置`,
        `“${selectedEntity.name}”和相关概念之间有什么关系？`,
        `如果我要向初学者介绍“${selectedEntity.name}”，应该怎么说？`,
      ]
    : [
        '这个知识库主要覆盖哪些本体论主题？',
        '请用通俗语言解释本体论是什么',
        '知识图谱中的领域和层次分别是什么意思？',
      ];

  const latestRelatedNames = activeSession?.messages.at(-1)?.relatedNames ?? [];
  const isBusy = sessions.some((session) => session.loading);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromBackend = async () => {
      try {
        const remoteState = normalizeAssistantState(await fetchOntologyAssistantState());
        const hasRemoteState = remoteState.sessions.length > 0
          && remoteState.sessions.some((session) => (
            session.messages.length > 0
            || session.draftQuestion.trim().length > 0
          ));
        const hasRemotePrompt = remoteState.businessPrompt.trim().length > 0;
        const hasRemoteModel = remoteState.modelName.trim() !== DEFAULT_MODEL_NAME;

        if (!cancelled && (hasRemoteState || hasRemotePrompt || hasRemoteModel)) {
          setSessions(remoteState.sessions);
          setActiveSessionId(remoteState.activeSessionId);
          setBusinessPrompt(remoteState.businessPrompt);
          setModelName(remoteState.modelName);
        }
      } catch {
        // Ignore hydration failures and fall back to local cache.
      } finally {
        if (!cancelled) {
          setBackendHydrated(true);
        }
      }
    };

    void hydrateFromBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const snapshot = {
      sessions,
      activeSessionId,
      businessPrompt,
      modelName,
    };

    window.localStorage.setItem(ASSISTANT_STATE_STORAGE_KEY, JSON.stringify(snapshot));

    if (!backendHydrated) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveOntologyAssistantState(snapshot).catch(() => undefined);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeSessionId, backendHydrated, businessPrompt, modelName, sessions]);

  const updateSession = (sessionId: string, updater: (session: ConversationSession) => ConversationSession) => {
    setSessions((currentSessions) => currentSessions.map((session) => (
      session.id === sessionId ? updater(session) : session
    )));
  };

  const handleDraftChange = (value: string) => {
    if (!activeSession) {
      return;
    }
    updateSession(activeSession.id, (session) => ({
      ...session,
      draftQuestion: value,
    }));
  };

  const handleNewSession = () => {
    const nextSession = createSession(sessions.length + 1);
    setSessions((currentSessions) => [nextSession, ...currentSessions]);
    setActiveSessionId(nextSession.id);
  };

  const handleAsk = async (nextQuestion?: string) => {
    if (!activeSession) {
      return;
    }

    const prompt = (nextQuestion ?? activeSession.draftQuestion).trim();
    if (!prompt) {
      return;
    }

    const sessionId = activeSession.id;
    const messageId = `message-${Date.now()}`;
    const conversationHistory: OntologyAssistantHistoryTurn[] = activeSession.messages
      .map((message) => ({
        question: message.question.trim(),
        answer: message.answer.trim(),
      }))
      .filter((message) => message.question && message.answer)
      .slice(-6);

    updateSession(sessionId, (session) => ({
      ...session,
      title: buildSessionTitle(prompt, session.title),
      draftQuestion: prompt,
      loading: true,
      error: null,
      statusMessage: '正在整理知识库上下文...',
      messages: [
        ...session.messages,
        {
          id: messageId,
          question: prompt,
          answer: '',
          relatedNames: [],
          toolRuns: [],
        },
      ],
    }));

    try {
      let streamedAnswer = '';
      let relatedNames: string[] = [];

      const result = await askOntologyAssistantStream({
        question: prompt,
        entityId: selectedEntity?.id,
        conversationId: sessionId,
        businessPrompt: businessPrompt.trim() || undefined,
        modelName: modelName.trim() || DEFAULT_MODEL_NAME,
        conversationHistory,
      }, {
        onContext: (context) => {
          relatedNames = context.related?.map((entity) => entity.name) ?? [];
          updateSession(sessionId, (session) => ({
            ...session,
            messages: session.messages.map((message) => (
              message.id === messageId
                ? { ...message, relatedNames }
                : message
            )),
          }));
        },
        onStatus: (message) => {
          updateSession(sessionId, (session) => ({
            ...session,
            statusMessage: message || null,
          }));
        },
        onAnswerDelta: (delta) => {
          streamedAnswer += delta;
          updateSession(sessionId, (session) => ({
            ...session,
            messages: session.messages.map((message) => (
              message.id === messageId
                ? { ...message, answer: streamedAnswer }
                : message
            )),
          }));
        },
        onToolStarted: (toolStart) => {
          updateSession(sessionId, (session) => ({
            ...session,
            messages: session.messages.map((message) => (
              message.id === messageId
                ? {
                    ...message,
                    toolRuns: upsertToolRun(
                      message.toolRuns,
                      toolStart.callId,
                      () => createToolRunFromStart(toolStart),
                      (run) => ({
                        ...run,
                        command: toolStart.command,
                        cwd: toolStart.cwd ?? run.cwd,
                        startedAt: toolStart.startedAt ?? run.startedAt,
                      }),
                    ),
                  }
                : message
            )),
          }));
        },
        onToolOutput: (toolOutput) => {
          updateSession(sessionId, (session) => ({
            ...session,
            messages: session.messages.map((message) => (
              message.id === messageId
                ? {
                    ...message,
                    toolRuns: upsertToolRun(
                      message.toolRuns,
                      toolOutput.callId,
                      () => createToolRunFromStart({
                        callId: toolOutput.callId,
                        command: toolOutput.command,
                        cwd: toolOutput.cwd,
                        startedAt: toolOutput.startedAt,
                      }),
                      (run) => applyToolOutputToRun(run, toolOutput),
                    ),
                  }
                : message
            )),
          }));
        },
        onToolFinished: (toolFinished) => {
          updateSession(sessionId, (session) => ({
            ...session,
            messages: session.messages.map((message) => (
              message.id === messageId
                ? {
                    ...message,
                    toolRuns: upsertToolRun(
                      message.toolRuns,
                      toolFinished.callId,
                      () => createToolRunFromStart({
                        callId: toolFinished.callId,
                        command: toolFinished.command,
                        cwd: toolFinished.cwd,
                        startedAt: toolFinished.startedAt,
                      }),
                      (run) => applyToolFinishToRun(run, toolFinished),
                    ),
                  }
                : message
            )),
          }));
        },
      });

      updateSession(sessionId, (session) => ({
        ...session,
        loading: false,
        statusMessage: null,
        draftQuestion: '',
        messages: session.messages.map((message) => (
          message.id === messageId
            ? {
                ...message,
                answer: result.answer || streamedAnswer || 'Agent 没有返回可显示的回答。',
                relatedNames: result.context?.related?.map((entity) => entity.name) ?? relatedNames,
              }
            : message
        )),
      }));
    } catch (requestError) {
      const errorMessage = requestError instanceof Error ? requestError.message : '请求失败';
      updateSession(sessionId, (session) => ({
        ...session,
        loading: false,
        error: errorMessage,
        statusMessage: null,
        messages: session.messages.map((message) => (
          message.id === messageId
            ? { ...message, answer: `请求失败：${errorMessage}` }
            : message
        )),
      }));
    }
  };

  if (!activeSession) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="w-5 h-5" />
                Agent 问答
              </CardTitle>
              <CardDescription>
                通过 Agent + LLM 基于当前知识库上下文回答问题。
              </CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleNewSession} disabled={isBusy}>
              <Plus className="w-4 h-4" />
              新对话
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">会话选择</p>
            <div className="space-y-2">
              {sessions.map((session, index) => {
                const isActive = session.id === activeSessionId;
                return (
                  <button
                    key={session.id}
                    type="button"
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border/60 bg-background hover:bg-muted/40'
                    }`}
                    onClick={() => setActiveSessionId(session.id)}
                    disabled={isBusy && !isActive}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{session.title || `新对话 ${index + 1}`}</span>
                      {session.loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {session.messages.length > 0 ? `${session.messages.length} 轮问答` : '空白会话'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">当前实体</span>
              {selectedEntity ? (
                <Badge variant="secondary">{selectedEntity.name}</Badge>
              ) : (
                <Badge variant="outline">未选择</Badge>
              )}
            </div>
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">问答提示词配置</p>
                  <p className="text-xs text-muted-foreground">
                    这里的内容会记录在当前浏览器，并在下一次提问时立即生效。留空则不注入业务层提示词。
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setBusinessPrompt('')}
                  disabled={!businessPrompt}
                >
                  <RotateCcw className="w-4 h-4" />
                  清空
                </Button>
              </div>
              <Textarea
                placeholder="例如：请优先使用知识库中的概念定义回答；如果证据不足，请明确说明依据不足。"
                value={businessPrompt}
                onChange={(event) => setBusinessPrompt(event.target.value)}
                className="min-h-28 bg-background"
              />
            </div>
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">模型选择</p>
                <p className="text-xs text-muted-foreground">
                  当前选择会被持久化保存，并在下一次提问时立即切换到对应模型。
                </p>
              </div>
              <Select
                value={getModelPresetValue(modelName)}
                onValueChange={(value) => {
                  if (value === CUSTOM_MODEL_OPTION) {
                    setModelName('');
                    return;
                  }

                  setModelName(value);
                }}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_MODEL_OPTION}>自定义模型名</SelectItem>
                </SelectContent>
              </Select>
              {getModelPresetValue(modelName) === CUSTOM_MODEL_OPTION ? (
                <Input
                  placeholder="输入自定义模型名，例如 openai/gpt-4.1-mini"
                  value={modelName}
                  onChange={(event) => setModelName(event.target.value)}
                />
              ) : null}
              <div className="text-xs text-muted-foreground">
                当前生效模型：<code className="text-foreground">{modelName || DEFAULT_MODEL_NAME}</code>
              </div>
            </div>
            <Textarea
              placeholder="输入你的问题，比如：形式本体论和哲学本体论有什么区别？"
              value={activeSession.draftQuestion}
              onChange={(event) => handleDraftChange(event.target.value)}
              className="min-h-40"
            />
          </div>

          <Button
            onClick={() => handleAsk()}
            disabled={activeSession.loading || !activeSession.draftQuestion.trim()}
            className="w-full"
          >
            {activeSession.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {activeSession.loading ? 'Agent 流式思考中...' : '提交问题'}
          </Button>

          {activeSession.statusMessage ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {activeSession.statusMessage}
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">快捷问题</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAsk(example)}
                  disabled={activeSession.loading}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>回答结果</CardTitle>
          <CardDescription>
            当前会话会保留历史问答，并支持切换到新对话。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSession.error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {activeSession.error}
            </div>
          ) : null}

          {activeSession.messages.length > 0 ? (
            <div className="space-y-4">
              {activeSession.messages.map((message) => (
                <div key={message.id} className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">问题</div>
                    <div className="mt-1 whitespace-pre-wrap font-medium leading-7">{message.question}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">回答</div>
                    <div className="mt-1 whitespace-pre-wrap leading-7 text-foreground">
                      {message.answer || (activeSession.loading && message.id === activeSession.messages.at(-1)?.id
                        ? '正在生成回答...'
                        : 'Agent 尚未返回内容。')}
                    </div>
                  </div>
                  {message.toolRuns.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">命令执行流</div>
                      {message.toolRuns.map((toolRun) => (
                        <div key={toolRun.callId} className="rounded-lg border border-border/60 bg-background/80 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={toolRun.status === 'success' ? 'secondary' : 'outline'}>
                              {toolRun.status === 'running' ? '运行中' : toolRun.status}
                            </Badge>
                            <code className="text-xs text-foreground">{toolRun.command}</code>
                          </div>
                          {toolRun.cwd ? (
                            <div className="mt-2 text-xs text-muted-foreground">
                              cwd: {toolRun.cwd}
                            </div>
                          ) : null}
                          {toolRun.stdout ? (
                            <div className="mt-3 space-y-1">
                              <div className="text-xs text-muted-foreground">stdout</div>
                              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-6 text-foreground">
                                {toolRun.stdout}
                              </pre>
                            </div>
                          ) : null}
                          {toolRun.stderr ? (
                            <div className="mt-3 space-y-1">
                              <div className="text-xs text-muted-foreground">stderr</div>
                              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-destructive/5 p-3 text-xs leading-6 text-foreground">
                                {toolRun.stderr}
                              </pre>
                            </div>
                          ) : null}
                          {!toolRun.stdout && !toolRun.stderr && toolRun.status !== 'running' ? (
                            <div className="mt-3 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                              命令已执行，但没有可显示的输出。
                            </div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>exitCode: {toolRun.exitCode ?? 'null'}</span>
                            <span>duration: {toolRun.durationMs ?? 0}ms</span>
                            {toolRun.truncated ? <span>日志已截断，仅显示最近 8KB</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {message.relatedNames.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">本轮回答参考的相关实体</p>
                      <div className="flex flex-wrap gap-2">
                        {message.relatedNames.map((name) => (
                          <Badge key={`${message.id}-${name}`} variant="outline">{name}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              提问后会在这里显示当前会话的 Agent 回答。
            </div>
          )}

          {latestRelatedNames.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">最近一轮参考的相关实体</p>
              <div className="flex flex-wrap gap-2">
                {latestRelatedNames.map((name) => (
                  <Badge key={name} variant="outline">{name}</Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
