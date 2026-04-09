import { useState, useEffect } from 'react';
import { fetchKnowledgeGraph, fetchOntologies, searchEntities as searchEntitiesRequest } from '@/lib/api';
import type { KnowledgeGraphData, Entity, OntologyModule } from '@/types/ontology';

export function useOntologyData() {
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraphData | null>(null);
  const [philosophicalOntology, setPhilosophicalOntology] = useState<OntologyModule | null>(null);
  const [formalOntology, setFormalOntology] = useState<OntologyModule | null>(null);
  const [scientificOntology, setScientificOntology] = useState<OntologyModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const [kgData, ontologies] = await Promise.all([
          fetchKnowledgeGraph(),
          fetchOntologies()
        ]);

        setKnowledgeGraph(kgData);
        setPhilosophicalOntology(ontologies.philosophicalOntology);
        setFormalOntology(ontologies.formalOntology);
        setScientificOntology(ontologies.scientificOntology);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getEntityById = (id: string): Entity | undefined => {
    return knowledgeGraph?.entity_index[id];
  };

  const searchEntities = async (query: string): Promise<Entity[]> => {
    if (!query.trim()) return [];
    return searchEntitiesRequest(query);
  };

  const getEntitiesByDomain = (domain: string): Entity[] => {
    if (!knowledgeGraph) return [];
    return Object.values(knowledgeGraph.entity_index).filter(entity => 
      entity.domain === domain
    );
  };

  const getEntitiesByLevel = (level: number): Entity[] => {
    if (!knowledgeGraph) return [];
    return Object.values(knowledgeGraph.entity_index).filter(entity => 
      entity.level === level
    );
  };

  const getRelatedEntities = (entityId: string): Entity[] => {
    if (!knowledgeGraph) return [];
    
    const related = knowledgeGraph.cross_references.filter(ref => 
      ref.source === entityId || ref.target === entityId
    );
    
    return related.map(ref => {
      const relatedId = ref.source === entityId ? ref.target : ref.source;
      return knowledgeGraph.entity_index[relatedId];
    }).filter(Boolean);
  };

  return {
    knowledgeGraph,
    philosophicalOntology,
    formalOntology,
    scientificOntology,
    loading,
    error,
    getEntityById,
    searchEntities,
    getEntitiesByDomain,
    getEntitiesByLevel,
    getRelatedEntities
  };
}
