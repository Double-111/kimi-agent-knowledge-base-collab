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
