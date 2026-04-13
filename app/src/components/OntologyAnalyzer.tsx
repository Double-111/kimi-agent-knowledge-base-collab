import { useEffect, useMemo, useState } from 'react';
import { Search, Layers, Box, Link2, HelpCircle, FileCode, Sparkles, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchAnalysis, type AnalysisResult } from '@/lib/api';
import type { Entity, KnowledgeLayer } from '@/types/ontology';

interface OntologyAnalyzerProps {
  entities: Entity[];
  selectedEntity?: Entity | null;
  onSelectEntity?: (entity: Entity) => void;
}

const layerLabels: Record<KnowledgeLayer, string> = {
  common: 'Common',
  domain: 'Domain',
  private: 'Private',
};

export function OntologyAnalyzer({ entities, selectedEntity, onSelectEntity }: OntologyAnalyzerProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzedEntity, setAnalyzedEntity] = useState<Entity | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exampleEntities = useMemo(() => {
    if (selectedEntity) {
      return [
        selectedEntity,
        ...entities
          .filter((entity) => entity.id !== selectedEntity.id)
          .sort((left, right) => {
            const leftScore = Number(left.domain === selectedEntity.domain);
            const rightScore = Number(right.domain === selectedEntity.domain);
            return rightScore - leftScore;
          })
          .slice(0, 5),
      ];
    }

    return entities.slice(0, 6);
  }, [entities, selectedEntity]);

  const resolveEntity = (query: string): Entity | null => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    return (
      entities.find((entity) => entity.name.trim().toLowerCase() === normalized)
      || entities.find((entity) => entity.name.includes(query.trim()))
      || null
    );
  };

  const handleAnalyze = async (value?: string, preferredEntity?: Entity | null) => {
    const query = (value ?? input).trim();
    if (!query) return;
    const matchedEntity = preferredEntity || resolveEntity(query);

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysis = await fetchAnalysis(query, matchedEntity?.id);
      setInput(query);
      setResult(analysis);
      setAnalyzedEntity(matchedEntity);
      if (matchedEntity && matchedEntity.id !== selectedEntity?.id) {
        onSelectEntity?.(matchedEntity);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!selectedEntity) {
      return;
    }

    setInput(selectedEntity.name);
    void handleAnalyze(selectedEntity.name, selectedEntity);
  }, [selectedEntity?.id]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            本体分析器
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">当前分析上下文来自 WiKiMG 导出的节点与关系</span>
            </div>
            {selectedEntity ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{selectedEntity.type}</Badge>
                <Badge variant="secondary">{selectedEntity.domain}</Badge>
                <Badge variant={selectedEntity.layer === 'private' ? 'destructive' : 'outline'}>
                  {layerLabels[selectedEntity.layer]}
                </Badge>
                <Badge variant="outline">{selectedEntity.source}</Badge>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                当前还没有选中节点，可以从浏览、图谱或搜索里先选一个实体。
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="输入当前 WiKiMG 知识库中的节点名称"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleAnalyze()}
              className="flex-1"
            />
            <Button onClick={() => void handleAnalyze()} disabled={isAnalyzing || !input.trim()}>
              {isAnalyzing ? '分析中...' : <><Search className="w-4 h-4 mr-2" />分析</>}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">当前 WiKiMG 节点:</span>
            {exampleEntities.map((entity) => (
              <Badge
                key={entity.id}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => void handleAnalyze(entity.name, entity)}
              >
                {entity.name}
              </Badge>
            ))}
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{result.entity_name}</CardTitle>
              <Badge>{result.primary_level}</Badge>
              {analyzedEntity ? (
                <>
                  <Badge variant="secondary">{analyzedEntity.domain}</Badge>
                  <Badge variant={analyzedEntity.layer === 'private' ? 'destructive' : 'outline'}>
                    {layerLabels[analyzedEntity.layer]}
                  </Badge>
                </>
              ) : null}
              {result.secondary_levels.map((level) => (
                <Badge key={level} variant="outline">{level}</Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="level" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="level"><Layers className="w-4 h-4 mr-1" />层级</TabsTrigger>
                <TabsTrigger value="attributes"><Box className="w-4 h-4 mr-1" />属性</TabsTrigger>
                <TabsTrigger value="relations"><Link2 className="w-4 h-4 mr-1" />关系</TabsTrigger>
                <TabsTrigger value="questions"><HelpCircle className="w-4 h-4 mr-1" />问题</TabsTrigger>
                <TabsTrigger value="formal"><FileCode className="w-4 h-4 mr-1" />形式化</TabsTrigger>
              </TabsList>

              <TabsContent value="level" className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">主层级</p>
                      <p className="font-medium">{result.ontology_breakdown.entity_level.main_level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">基础说明</p>
                      <p>{result.ontology_breakdown.entity_level.physical_basis}</p>
                    </div>
                    {result.ontology_breakdown.entity_level.social_dimension ? (
                      <div>
                        <p className="text-sm text-muted-foreground">语境维度</p>
                        <p>{result.ontology_breakdown.entity_level.social_dimension}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attributes" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-lg">本质属性</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {result.ontology_breakdown.essential_attributes.map((item) => (
                        <div key={item.attribute} className="rounded-lg bg-muted/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{item.attribute}</span>
                            <Badge variant="outline">{item.necessity}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-lg">偶性属性</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {result.ontology_breakdown.accidental_attributes.map((item) => (
                        <div key={item.attribute} className="rounded-lg bg-muted/40 p-3">
                          <span className="font-medium">{item.attribute}</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.examples.map((example) => (
                              <Badge key={example} variant="secondary">{example}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="relations" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-lg">组成与结构</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {result.ontology_breakdown.components.map((item) => (
                        <div key={`${item.part}-${item.ontology_relation}`} className="rounded-lg bg-muted/40 p-3">
                          <p className="font-medium">{item.part}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.function}</p>
                          <Badge variant="outline" className="mt-2">{item.ontology_relation}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-lg">概念关系</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {result.ontology_breakdown.relations.map((item) => (
                        <div key={`${item.relation}-${item.target}`} className="rounded-lg bg-muted/40 p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.target}</span>
                            <Badge variant="secondary">{item.relation}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="questions" className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {result.ontology_breakdown.ontological_questions.map((item) => (
                      <div key={item.question} className="rounded-lg bg-muted/40 p-4">
                        <p className="font-medium">{item.question}</p>
                        <p className="text-sm text-muted-foreground mt-2">{item.discussion}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="formal" className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {Object.entries(result.ontology_breakdown.formalization).map(([key, value]) => (
                      value ? (
                        <div key={key} className="rounded-lg bg-slate-950 text-slate-50 p-4">
                          <p className="text-xs uppercase text-slate-400 mb-2">{key}</p>
                          <pre className="whitespace-pre-wrap text-sm">{value}</pre>
                        </div>
                      ) : null
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
