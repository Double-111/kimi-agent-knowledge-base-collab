import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Layers, Atom, Tag, Link2, FileText } from 'lucide-react';
import type { Entity } from '@/types/ontology';

interface EntityDetailProps {
  entity: Entity | null;
  relatedEntities?: Entity[];
  onSelectRelated?: (entity: Entity) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  '哲学概念': <BookOpen className="w-5 h-5" />,
  '形式概念': <Layers className="w-5 h-5" />,
  '科学概念': <Atom className="w-5 h-5" />,
};

const levelColors: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-green-100 text-green-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-purple-100 text-purple-800',
  5: 'bg-pink-100 text-pink-800',
  6: 'bg-indigo-100 text-indigo-800',
};

export function EntityDetail({ entity, relatedEntities = [], onSelectRelated }: EntityDetailProps) {
  if (!entity) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <BookOpen className="w-16 h-16 mb-4 opacity-50" />
          <p>选择一个实体查看详情</p>
        </CardContent>
      </Card>
    );
  }

  const formatProperties = (properties: Record<string, any>): string => {
    if (typeof properties === 'string') return properties;
    if (Array.isArray(properties)) return properties.join(', ');
    if (typeof properties === 'object') {
      return Object.entries(properties)
        .map(([key, value]) => `${key}: ${formatProperties(value)}`)
        .join('; ');
    }
    return String(properties);
  };

  return (
    <ScrollArea className="h-full">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {typeIcons[entity.type] || <BookOpen className="w-5 h-5" />}
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">{entity.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{entity.type}</Badge>
                  <Badge variant="secondary">{entity.domain}</Badge>
                  {entity.level && (
                    <Badge className={levelColors[entity.level]}>
                      层次 {entity.level}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 定义 */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              定义
            </h4>
            <p className="text-base leading-relaxed bg-muted/50 p-4 rounded-lg">
              {entity.definition || '暂无定义'}
            </p>
          </div>

          <Separator />

          {/* 属性 */}
          {entity.properties && Object.keys(entity.properties).length > 0 && (
            <>
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  属性
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(entity.properties).slice(0, 8).map(([key, value]) => (
                    <div key={key} className="bg-muted/30 p-3 rounded-lg">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        {key}
                      </span>
                      <p className="text-sm mt-1">
                        {formatProperties(value).substring(0, 100)}
                        {formatProperties(value).length > 100 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* 相关实体 */}
          {relatedEntities.length > 0 && (
            <>
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  相关实体 ({relatedEntities.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {relatedEntities.map((related) => (
                    <Badge
                      key={related.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => onSelectRelated?.(related)}
                    >
                      {related.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* 元信息 */}
          <div className="text-xs text-muted-foreground">
            <p>ID: {entity.id}</p>
            <p>来源: {entity.source}</p>
          </div>
        </CardContent>
      </Card>
    </ScrollArea>
  );
}
