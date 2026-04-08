// 本体论知识库类型定义

export interface Entity {
  id: string;
  name: string;
  type: string;
  domain: string;
  level?: number;
  source: string;
  definition: string;
  properties: Record<string, any>;
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  description?: string;
}

export interface HierarchyNode {
  id: string;
  name: string;
  level: number;
  children?: HierarchyNode[];
  entity?: Entity;
}

export interface DomainInfo {
  name: string;
  description: string;
  count: number;
}

export interface KnowledgeGraphData {
  metadata: {
    title: string;
    version: string;
    description: string;
  };
  statistics: {
    total_entities: number;
    total_relations: number;
    domains: string[];
    levels: number[];
  };
  entity_index: Record<string, Entity>;
  cross_references: CrossReference[];
}

export interface CrossReference {
  source: string;
  target: string;
  relation: string;
  description: string;
}

export interface OntologyModule {
  metadata: {
    title: string;
    created_by: string;
    version: string;
    description: string;
  };
}

export type ViewMode = 'hierarchy' | 'graph' | 'list' | 'detail';
export type DomainFilter = 'all' | 'philosophy' | 'formal' | 'science';
