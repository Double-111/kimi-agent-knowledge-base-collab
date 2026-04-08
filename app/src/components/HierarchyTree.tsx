import React, { useState } from 'react';
import { ChevronRight, ChevronDown, BookOpen, Layers, Atom, Brain, Users, Database } from 'lucide-react';
import type { Entity } from '@/types/ontology';

interface HierarchyTreeProps {
  entities: Entity[];
  onSelectEntity: (entity: Entity) => void;
  selectedEntityId?: string;
}

interface TreeNode {
  id: string;
  name: string;
  level: number;
  entity: Entity;
  children: TreeNode[];
}

const domainIcons: Record<string, React.ReactNode> = {
  '哲学': <BookOpen className="w-4 h-4" />,
  '形式': <Layers className="w-4 h-4" />,
  '物理': <Atom className="w-4 h-4" />,
  '化学': <Atom className="w-4 h-4" />,
  '生物': <Atom className="w-4 h-4" />,
  '认知': <Brain className="w-4 h-4" />,
  '社会': <Users className="w-4 h-4" />,
  '信息': <Database className="w-4 h-4" />,
};

const levelColors: Record<number, string> = {
  1: 'text-blue-600',
  2: 'text-green-600',
  3: 'text-yellow-600',
  4: 'text-purple-600',
  5: 'text-pink-600',
  6: 'text-indigo-600',
};

export function HierarchyTree({ entities, onSelectEntity, selectedEntityId }: HierarchyTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 构建树结构
  const buildTree = (): TreeNode[] => {
    const domainMap = new Map<string, TreeNode>();
    
    entities.forEach(entity => {
      const domain = entity.domain;
      if (!domainMap.has(domain)) {
        domainMap.set(domain, {
          id: `domain_${domain}`,
          name: domain,
          level: 0,
          entity: entity,
          children: []
        });
      }
      domainMap.get(domain)!.children.push({
        id: entity.id,
        name: entity.name,
        level: entity.level || 0,
        entity: entity,
        children: []
      });
    });

    return Array.from(domainMap.values());
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const tree = buildTree();

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isSelected = node.entity.id === selectedEntityId;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer
            transition-colors duration-200
            ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}
            ${depth > 0 ? 'ml-6' : ''}
          `}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => {
            if (hasChildren) toggleNode(node.id);
            onSelectEntity(node.entity);
          }}
        >
          {hasChildren && (
            <span className="text-muted-foreground">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          
          <span className="text-muted-foreground">
            {domainIcons[node.name] || <BookOpen className="w-4 h-4" />}
          </span>
          
          <span className={`font-medium ${node.level ? levelColors[node.level] || '' : ''}`}>
            {node.name}
          </span>
          
          {hasChildren && (
            <span className="text-xs text-muted-foreground ml-2">
              ({node.children.length})
            </span>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div className="mt-1">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg bg-card p-4">
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5" />
        本体层次结构
      </h3>
      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {tree.map(node => renderNode(node))}
      </div>
    </div>
  );
}
