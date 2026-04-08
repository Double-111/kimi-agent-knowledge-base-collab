import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TreePine, 
  Network, 
  List, 
  ChevronRight, 
  ChevronDown,
  BookOpen,
  Layers,
  Atom,
  Link2,
  Tag,
  Info
} from 'lucide-react';
import type { Entity, CrossReference } from '@/types/ontology';

interface OntologyBrowserProps {
  entities: Entity[];
  crossReferences: CrossReference[];
  onSelectEntity: (entity: Entity) => void;
  selectedEntityId?: string;
}

interface TreeNodeProps {
  entity: Entity;
  entities: Entity[];
  level: number;
  selectedId?: string;
  onSelect: (entity: Entity) => void;
  expandedNodes: Set<string>;
  onToggleExpand: (id: string) => void;
}

function TreeNode({ 
  entity, 
  entities, 
  level, 
  selectedId, 
  onSelect,
  expandedNodes,
  onToggleExpand
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(entity.id);
  const isSelected = entity.id === selectedId;
  
  // 查找子实体（同领域且可能相关）
  const childEntities = entities.filter(e => 
    e.domain === entity.domain && 
    e.id !== entity.id &&
    e.name !== entity.name
  ).slice(0, 5);

  const hasChildren = childEntities.length > 0;

  const typeIcons: Record<string, React.ReactNode> = {
    '哲学概念': <BookOpen className="w-4 h-4" />,
    '形式概念': <Layers className="w-4 h-4" />,
    '科学概念': <Atom className="w-4 h-4" />,
  };

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer
          transition-colors duration-200
          ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}
        `}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => onSelect(entity)}
      >
        {hasChildren && (
          <span 
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(entity.id);
            }}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        
        <span className="text-muted-foreground">
          {typeIcons[entity.type] || <BookOpen className="w-4 h-4" />}
        </span>
        
        <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
          {entity.name}
        </span>
        
        <Badge variant="outline" className="text-xs ml-2">
          {entity.domain}
        </Badge>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {childEntities.map(child => (
            <TreeNode
              key={child.id}
              entity={child}
              entities={entities}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OntologyBrowser({ 
  entities, 
  crossReferences, 
  onSelectEntity, 
  selectedEntityId 
}: OntologyBrowserProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'hierarchy' | 'list' | 'relations'>('hierarchy');

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  // 按领域分组
  const entitiesByDomain = entities.reduce((acc, entity) => {
    if (!acc[entity.domain]) {
      acc[entity.domain] = [];
    }
    acc[entity.domain].push(entity);
    return acc;
  }, {} as Record<string, Entity[]>);

  // 获取选中实体的关系
  const selectedEntityRelations = selectedEntityId 
    ? crossReferences.filter(ref => ref.source === selectedEntityId || ref.target === selectedEntityId)
    : [];

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TreePine className="w-5 h-5" />
            本体浏览器
          </CardTitle>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`p-2 rounded ${viewMode === 'hierarchy' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="层次视图"
            >
              <TreePine className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="列表视图"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('relations')}
              className={`p-2 rounded ${viewMode === 'relations' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="关系视图"
            >
              <Network className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={viewMode} className="w-full">
          <TabsContent value="hierarchy" className="m-0">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-4">
                {Object.entries(entitiesByDomain).map(([domain, domainEntities]) => (
                  <div key={domain}>
                    <div className="flex items-center gap-2 mb-2 px-3">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        {domain}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {domainEntities.length}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {domainEntities.slice(0, 5).map(entity => (
                        <TreeNode
                          key={entity.id}
                          entity={entity}
                          entities={entities}
                          level={0}
                          selectedId={selectedEntityId}
                          onSelect={onSelectEntity}
                          expandedNodes={expandedNodes}
                          onToggleExpand={toggleExpand}
                        />
                      ))}
                      {domainEntities.length > 5 && (
                        <div className="text-xs text-muted-foreground px-3 py-1">
                          +{domainEntities.length - 5} 更多...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="list" className="m-0">
            <ScrollArea className="h-[500px]">
              <div className="p-4">
                <div className="space-y-2">
                  {entities.map(entity => (
                    <div
                      key={entity.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg cursor-pointer
                        transition-colors duration-200
                        ${entity.id === selectedEntityId ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent'}
                      `}
                      onClick={() => onSelectEntity(entity)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-3 h-3 rounded-full
                          ${entity.type === '哲学概念' ? 'bg-blue-500' : ''}
                          ${entity.type === '形式概念' ? 'bg-green-500' : ''}
                          ${entity.type === '科学概念' ? 'bg-purple-500' : ''}
                        `} />
                        <div>
                          <span className="font-medium">{entity.name}</span>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {entity.definition}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {entity.domain}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="relations" className="m-0">
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-4">
                {selectedEntity ? (
                  <>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4" />
                        选中实体
                      </h4>
                      <p className="text-lg font-medium">{selectedEntity.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedEntity.definition}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Link2 className="w-4 h-4" />
                        关系 ({selectedEntityRelations.length})
                      </h4>
                      {selectedEntityRelations.length > 0 ? (
                        <div className="space-y-2">
                          {selectedEntityRelations.map((ref, index) => {
                            const isSource = ref.source === selectedEntityId;
                            const relatedId = isSource ? ref.target : ref.source;
                            const relatedEntity = entities.find(e => e.id === relatedId);
                            
                            return (
                              <div 
                                key={index}
                                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{selectedEntity.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {ref.relation}
                                  </Badge>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                <span 
                                  className="font-medium text-primary cursor-pointer hover:underline"
                                  onClick={() => relatedEntity && onSelectEntity(relatedEntity)}
                                >
                                  {relatedEntity?.name || relatedId}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">暂无关系数据</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>选择一个实体查看其关系</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4" />
                    所有关系 ({crossReferences.length})
                  </h4>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {crossReferences.map((ref, index) => {
                      const sourceEntity = entities.find(e => e.id === ref.source);
                      const targetEntity = entities.find(e => e.id === ref.target);
                      
                      return (
                        <div 
                          key={index}
                          className="flex items-center gap-2 text-sm p-2 hover:bg-muted/50 rounded"
                        >
                          <span className="text-muted-foreground">{sourceEntity?.name || ref.source}</span>
                          <Badge variant="outline" className="text-xs">{ref.relation}</Badge>
                          <span className="text-muted-foreground">{targetEntity?.name || ref.target}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
