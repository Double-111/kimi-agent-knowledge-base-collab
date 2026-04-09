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
