import type { Entity, KnowledgeGraphData, OntologyModule } from '@/types/ontology';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

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
}): Promise<{
  answer: string;
  context?: {
    entity?: Entity | null;
    related?: Entity[];
    searchHits?: Entity[];
  };
}> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseJson(response);
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
