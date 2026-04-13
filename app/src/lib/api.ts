import type { Entity, KnowledgeGraphData, OntologyModule } from '@/types/ontology';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function parseSseEvent(rawEvent: string): { event: string; data: unknown } | null {
  const lines = rawEvent
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  const eventLine = lines.find((line) => line.startsWith('event: '));
  const dataLine = lines.find((line) => line.startsWith('data: '));
  if (!eventLine || !dataLine) {
    return null;
  }

  return {
    event: eventLine.slice('event: '.length),
    data: JSON.parse(dataLine.slice('data: '.length)),
  };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchKnowledgeGraph(): Promise<KnowledgeGraphData> {
  const response = await fetch(`${API_BASE}/api/knowledge-graph`);
  return parseJson<KnowledgeGraphData>(response);
}

export async function fetchOntologies(): Promise<{
  philosophicalOntology: OntologyModule;
  formalOntology: OntologyModule;
  scientificOntology: OntologyModule;
}> {
  const response = await fetch(`${API_BASE}/api/ontologies`);
  return parseJson(response);
}

export async function searchEntities(query: string): Promise<Entity[]> {
  const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
  return parseJson<Entity[]>(response);
}

export async function askOntologyAssistant(input: {
  question: string;
  entityId?: string;
  conversationId?: string;
  businessPrompt?: string;
  modelName?: string;
  conversationHistory?: OntologyAssistantHistoryTurn[];
}): Promise<OntologyAssistantResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseJson(response);
}

export interface OntologyAssistantContext {
  entity?: Entity | null;
  related?: Entity[];
  searchHits?: Entity[];
}

export interface OntologyAssistantResponse {
  answer: string;
  context?: OntologyAssistantContext;
  raw?: unknown;
  stderr?: string;
}

export interface OntologyAssistantHistoryTurn {
  question: string;
  answer: string;
}

export interface OntologyAssistantToolStartedEvent {
  callId: string;
  command: string;
  cwd: string | null;
  startedAt: string;
}

export interface OntologyAssistantToolOutputEvent {
  callId: string;
  command: string;
  stream: 'stdout' | 'stderr';
  chunk: string;
  cwd: string | null;
  startedAt: string;
}

export interface OntologyAssistantToolFinishedEvent {
  callId: string;
  command: string;
  status: 'running' | 'success' | 'error' | 'timeout' | 'cancelled' | 'rejected';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  cwd: string | null;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string;
}

export interface PersistedOntologyAssistantToolRun {
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

export interface PersistedOntologyAssistantMessage {
  id: string;
  question: string;
  answer: string;
  relatedNames: string[];
  toolRuns: PersistedOntologyAssistantToolRun[];
}

export interface PersistedOntologyAssistantSession {
  id: string;
  title: string;
  draftQuestion: string;
  messages: PersistedOntologyAssistantMessage[];
  error: string | null;
  loading: boolean;
  statusMessage: string | null;
}

export interface OntologyAssistantSessionState {
  sessions: PersistedOntologyAssistantSession[];
  activeSessionId: string;
  businessPrompt: string;
  modelName: string;
}

export interface OntologyAssistantStreamHandlers {
  onStatus?: (message: string) => void;
  onContext?: (context: OntologyAssistantContext) => void;
  onAnswerDelta?: (delta: string) => void;
  onToolStarted?: (event: OntologyAssistantToolStartedEvent) => void;
  onToolOutput?: (event: OntologyAssistantToolOutputEvent) => void;
  onToolFinished?: (event: OntologyAssistantToolFinishedEvent) => void;
  onComplete?: (response: OntologyAssistantResponse) => void;
}

export async function fetchOntologyAssistantState(): Promise<OntologyAssistantSessionState> {
  const response = await fetch(`${API_BASE}/api/chat/state`);
  return parseJson<OntologyAssistantSessionState>(response);
}

export async function saveOntologyAssistantState(
  input: OntologyAssistantSessionState,
): Promise<OntologyAssistantSessionState> {
  const response = await fetch(`${API_BASE}/api/chat/state`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseJson<OntologyAssistantSessionState>(response);
}

export async function askOntologyAssistantStream(
  input: {
    question: string;
    entityId?: string;
    conversationId?: string;
    businessPrompt?: string;
    modelName?: string;
    conversationHistory?: OntologyAssistantHistoryTurn[];
  },
  handlers: OntologyAssistantStreamHandlers = {},
  options: {
    signal?: AbortSignal;
  } = {},
): Promise<OntologyAssistantResponse> {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Streaming response body is missing.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponse: OntologyAssistantResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsed = parseSseEvent(rawEvent);
      if (parsed) {
        const eventData = asObject(parsed.data);
        if (parsed.event === 'status') {
          handlers.onStatus?.(typeof eventData?.message === 'string' ? eventData.message : '');
        } else if (parsed.event === 'context') {
          handlers.onContext?.((parsed.data as OntologyAssistantResponse['context']) ?? {});
        } else if (parsed.event === 'answer_delta') {
          handlers.onAnswerDelta?.(typeof eventData?.delta === 'string' ? eventData.delta : '');
        } else if (parsed.event === 'tool_started') {
          handlers.onToolStarted?.(parsed.data as OntologyAssistantToolStartedEvent);
        } else if (parsed.event === 'tool_output') {
          handlers.onToolOutput?.(parsed.data as OntologyAssistantToolOutputEvent);
        } else if (parsed.event === 'tool_finished') {
          handlers.onToolFinished?.(parsed.data as OntologyAssistantToolFinishedEvent);
        } else if (parsed.event === 'complete') {
          finalResponse = parsed.data as OntologyAssistantResponse;
          handlers.onComplete?.(finalResponse);
          return finalResponse;
        } else if (parsed.event === 'error') {
          throw new Error(typeof eventData?.message === 'string' ? eventData.message : 'Streaming request failed.');
        }
      }
      boundary = buffer.indexOf('\n\n');
    }

    if (done) {
      break;
    }
  }

  if (!finalResponse) {
    throw new Error('Question stream ended before completion.');
  }

  return finalResponse;
}

export interface AnalysisResult {
  entity_name: string;
  primary_level: string;
  secondary_levels: string[];
  ontology_breakdown: {
    entity_level: {
      main_level: string;
      physical_basis: string;
      social_dimension?: string;
    };
    essential_attributes: Array<{
      attribute: string;
      description: string;
      necessity: string;
    }>;
    accidental_attributes: Array<{
      attribute: string;
      examples: string[];
    }>;
    components: Array<{
      part: string;
      function: string;
      material?: string;
      ontology_relation: string;
    }>;
    relations: Array<{
      relation: string;
      target: string;
      description: string;
    }>;
    ontological_questions: Array<{
      question: string;
      discussion: string;
    }>;
    formalization: {
      RDF?: string;
      OWL?: string;
      description_logic?: string;
    };
  };
}

export interface SystemAnalysisData {
  entity: string;
  holistic_properties: string[];
  boundary: {
    physical?: string;
    functional?: string;
    cognitive?: string;
    dynamic?: string;
  };
  environment: {
    description: string;
    inputs: string[];
    outputs: string[];
  };
  feedback: {
    negative: string[];
    positive: string[];
  };
  hierarchy: {
    subsystems: string[];
    supersystems: string[];
  };
  emergence_examples: string[];
  systems_questions: Array<{
    question: string;
    analysis: string;
  }>;
}

export interface EducationContent {
  featured_topic: {
    title: string;
    summary: string;
    audience: string;
    reading_time: string;
    takeaways: string[];
  };
  primers: Array<{
    title: string;
    focus: string;
    summary: string;
    tags: string[];
  }>;
  scenarios: Array<{
    title: string;
    question: string;
    answer: string;
  }>;
  selected_entity_guide: {
    entity: string;
    why_it_matters: string;
    beginner_angle: string;
    connected_concepts: string[];
  } | null;
}

export interface AboutContent {
  platform: {
    name: string;
    vision: string;
    description: string;
  };
  modules: Array<{
    name: string;
    purpose: string;
    status: string;
  }>;
  workflow: string[];
  roadmap: Array<{
    title: string;
    detail: string;
  }>;
  metrics: {
    provider: string;
    entities: number;
    relations: number;
    domains: number;
    levels: number;
    layers: number;
  };
}

export interface EditorWorkspace {
  entity_id?: string;
  name: string;
  type: string;
  domain: string;
  source: string;
  definition: string;
  properties_text: string;
  suggestions: {
    recommended_type: string;
    suggested_relations: string[];
    rdf_preview: string;
    owl_preview: string;
  };
}

export interface EditorPreview {
  summary: string;
  rdf: string;
  owl: string;
  warnings: string[];
}

export async function fetchAnalysis(query: string, entityId?: string): Promise<AnalysisResult> {
  const params = new URLSearchParams({ q: query });
  if (entityId) {
    params.set('entityId', entityId);
  }

  const response = await fetch(`${API_BASE}/api/analysis?${params.toString()}`);
  return parseJson<AnalysisResult>(response);
}

export async function fetchSystemAnalysis(query: string, entityId?: string): Promise<SystemAnalysisData> {
  const params = new URLSearchParams({ q: query });
  if (entityId) {
    params.set('entityId', entityId);
  }

  const response = await fetch(`${API_BASE}/api/system-analysis?${params.toString()}`);
  return parseJson<SystemAnalysisData>(response);
}

export async function fetchEducationContent(entityId?: string): Promise<EducationContent> {
  const params = new URLSearchParams();
  if (entityId) {
    params.set('entityId', entityId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/api/education${suffix}`);
  return parseJson<EducationContent>(response);
}

export async function fetchAboutContent(): Promise<AboutContent> {
  const response = await fetch(`${API_BASE}/api/about`);
  return parseJson<AboutContent>(response);
}

export async function fetchEditorWorkspace(entityId?: string): Promise<EditorWorkspace> {
  const params = new URLSearchParams();
  if (entityId) {
    params.set('entityId', entityId);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/api/editor/workspace${suffix}`);
  return parseJson<EditorWorkspace>(response);
}

export async function previewEditorDraft(input: {
  entityId?: string;
  name: string;
  type: string;
  domain: string;
  source: string;
  definition: string;
  propertiesText: string;
}): Promise<EditorPreview> {
  const response = await fetch(`${API_BASE}/api/editor/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseJson<EditorPreview>(response);
}
