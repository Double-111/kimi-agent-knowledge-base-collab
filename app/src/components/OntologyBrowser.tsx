import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Link2, Sparkles, TreePine } from 'lucide-react';
import type { CrossReference, Entity, KnowledgeLayer } from '@/types/ontology';

interface OntologyBrowserProps {
  entities: Entity[];
  crossReferences: CrossReference[];
  onSelectEntity: (entity: Entity) => void;
  selectedEntityId?: string;
}

const layerLabels: Record<KnowledgeLayer, string> = {
  common: 'Common',
  domain: 'Domain',
  private: 'Private',
};

export function OntologyBrowser({
  entities,
  crossReferences,
  onSelectEntity,
  selectedEntityId,
}: OntologyBrowserProps) {
  const domainCount = new Set(entities.map((entity) => entity.domain)).size;
  const layerCount = new Set(entities.map((entity) => entity.layer)).size;
  const selectedEntity = entities.find((entity) => entity.id === selectedEntityId) ?? entities[0];

  const spotlightEntities = selectedEntity
    ? [
        selectedEntity,
        ...entities
          .filter((entity) => entity.id !== selectedEntity.id)
          .sort((left, right) => {
            const leftScore = Number(left.domain === selectedEntity.domain);
            const rightScore = Number(right.domain === selectedEntity.domain);
            return rightScore - leftScore;
          })
          .slice(0, 5),
      ]
    : entities.slice(0, 6);

  const selectedRelations = selectedEntity
    ? crossReferences.filter(
        (reference) =>
          reference.source === selectedEntity.id || reference.target === selectedEntity.id,
      )
    : [];

  return (
    <Card className="h-full overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-br from-slate-50 via-white to-blue-50/70 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TreePine className="h-5 w-5 text-primary" />
          概念速览
        </CardTitle>
        <CardDescription>
          这里会优先展示当前过滤范围内的代表节点，方便快速比较不同领域和存储层的内容。
        </CardDescription>

        <div className="grid grid-cols-2 gap-3 pt-1 lg:grid-cols-4">
          <div className="rounded-xl border bg-background/80 p-3">
            <div className="text-xs text-muted-foreground">领域数</div>
            <div className="mt-1 text-xl font-semibold">{domainCount}</div>
          </div>
          <div className="rounded-xl border bg-background/80 p-3">
            <div className="text-xs text-muted-foreground">存储层</div>
            <div className="mt-1 text-xl font-semibold">{layerCount}</div>
          </div>
          <div className="rounded-xl border bg-background/80 p-3">
            <div className="text-xs text-muted-foreground">实体数</div>
            <div className="mt-1 text-xl font-semibold">{entities.length}</div>
          </div>
          <div className="rounded-xl border bg-background/80 p-3">
            <div className="text-xs text-muted-foreground">关系数</div>
            <div className="mt-1 text-xl font-semibold">{crossReferences.length}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[640px]">
          <div className="space-y-4 p-4">
            {selectedEntity ? (
              <div className="rounded-2xl border bg-blue-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-950">
                  <Sparkles className="h-4 w-4" />
                  当前主阅读
                </div>
                <div className="mt-2 text-lg font-semibold">{selectedEntity.name}</div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedEntity.definition}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedEntity.type}</Badge>
                  <Badge variant="secondary">{selectedEntity.domain}</Badge>
                  <Badge variant={selectedEntity.layer === 'private' ? 'destructive' : 'outline'}>
                    {layerLabels[selectedEntity.layer]}
                  </Badge>
                  <Badge variant="outline">{selectedRelations.length} 条关系</Badge>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border bg-slate-50/80 p-4">
              <div className="text-sm font-medium">旁边直接能看到什么</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                每张卡片都会显示名称、定义摘要、业务领域、存储层和关系数量。把某个节点设为主阅读后，右侧详情和相关实体会一起更新。
              </p>
            </div>

            <div className="space-y-3">
              {spotlightEntities.map((entity) => {
                const isSelected = entity.id === selectedEntityId;
                const relationCount = crossReferences.filter(
                  (reference) =>
                    reference.source === entity.id || reference.target === entity.id,
                ).length;

                return (
                  <div
                    key={entity.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      isSelected ? 'border-primary/40 bg-primary/5' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{entity.name}</span>
                          {isSelected ? <Badge variant="secondary">正在阅读</Badge> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{entity.domain}</Badge>
                          <Badge variant={entity.layer === 'private' ? 'destructive' : 'outline'}>
                            {layerLabels[entity.layer]}
                          </Badge>
                          <Badge variant="outline">{entity.type}</Badge>
                          <Badge variant="outline">{relationCount} 条关系</Badge>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {entity.definition}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5" />
                        可继续延伸到关联概念
                      </div>
                      {!isSelected ? (
                        <button
                          type="button"
                          onClick={() => onSelectEntity(entity)}
                          className="rounded-full border px-3 py-1 font-medium text-foreground transition-colors hover:bg-slate-50"
                        >
                          设为主阅读
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-primary" />
                使用方式
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                先用上方层过滤缩小范围，再在左侧比较候选节点，最后把需要深入阅读的节点切到右侧查看完整定义、属性和关联。
              </p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
