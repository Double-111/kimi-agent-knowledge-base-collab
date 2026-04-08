import { useState, useEffect } from 'react';
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
        
        const [kgRes, philRes, formalRes, sciRes] = await Promise.all([
          fetch('/data/knowledge-graph/unified-knowledge-graph.json'),
          fetch('/data/core-ontology/philosophical-ontology.json'),
          fetch('/data/core-ontology/formal-ontology.json'),
          fetch('/data/domain-ontology/scientific-ontology.json')
        ]);

        if (!kgRes.ok) throw new Error('Failed to load knowledge graph');
        if (!philRes.ok) throw new Error('Failed to load philosophical ontology');
        if (!formalRes.ok) throw new Error('Failed to load formal ontology');
        if (!sciRes.ok) throw new Error('Failed to load scientific ontology');

        const [kgData, philData, formalData, sciData] = await Promise.all([
          kgRes.json(),
          philRes.json(),
          formalRes.json(),
          sciRes.json()
        ]);

        setKnowledgeGraph(kgData);
        setPhilosophicalOntology(philData);
        setFormalOntology(formalData);
        setScientificOntology(sciData);
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

  const searchEntities = (query: string): Entity[] => {
    if (!knowledgeGraph || !query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return Object.values(knowledgeGraph.entity_index).filter(entity => 
      entity.name.toLowerCase().includes(lowerQuery) ||
      entity.definition.toLowerCase().includes(lowerQuery) ||
      entity.domain.toLowerCase().includes(lowerQuery)
    );
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
