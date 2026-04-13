// 本体论知识库类型定义

export type KnowledgeLayer = 'common' | 'domain' | 'private';

export interface MarkdownInlineToken {
  type: 'text' | 'link' | 'code' | 'strong' | 'emphasis';
  text: string;
  href?: string;
  target_ref?: string;
  external?: boolean;
}

export interface MarkdownListItem {
  text: string;
  tokens?: MarkdownInlineToken[];
  checked?: boolean;
}

export interface MarkdownTableCell {
  text: string;
  tokens?: MarkdownInlineToken[];
}

export interface MarkdownBlock {
  type: 'paragraph' | 'heading' | 'list' | 'ordered_list' | 'checklist' | 'quote' | 'callout' | 'code' | 'table';
  text?: string;
  tokens?: MarkdownInlineToken[];
  items?: MarkdownListItem[];
  language?: string;
  level?: number;
  tone?: string;
  title?: string;
  header?: MarkdownTableCell[];
  rows?: MarkdownTableCell[][];
}

export interface FormattedSection {
  title: string;
  blocks: MarkdownBlock[];
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  domain: string;
  layer: KnowledgeLayer;
  level?: number;
  source: string;
  definition: string;
  properties: Record<string, any>;
  formatted_sections?: FormattedSection[];
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
    sources?: string[];
    layers: KnowledgeLayer[];
    layer_counts: Partial<Record<KnowledgeLayer, number>>;
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
