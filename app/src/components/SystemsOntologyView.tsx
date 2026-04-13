import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRightLeft, Boxes, Circle, Database, Globe, Layers, RefreshCw, Search, Square, Target, Triangle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchSystemAnalysis, type SystemAnalysisData } from '@/lib/api';
import type { Entity, KnowledgeLayer } from '@/types/ontology';

interface SystemsOntologyViewProps {
  entities: Entity[];
  selectedEntity?: Entity | null;
  onSelectEntity?: (entity: Entity) => void;
}

const layerLabels: Record<KnowledgeLayer, string> = {
  common: 'Common',
  domain: 'Domain',
  private: 'Private',
};

export function SystemsOntologyView({ entities, selectedEntity, onSelectEntity }: SystemsOntologyViewProps) {
  const [analysis, setAnalysis] = useState<SystemAnalysisData | null>(null);
  const [input, setInput] = useState('');
  const [analyzedEntity, setAnalyzedEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(false);
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
    if (!query) {
      return;
    }

    const matchedEntity = preferredEntity || resolveEntity(query);

    setLoading(true);
    setError(null);
    try {
      const result = await fetchSystemAnalysis(query, matchedEntity?.id);
      setInput(query);
      setAnalysis(result);
      setAnalyzedEntity(matchedEntity);
      if (matchedEntity && matchedEntity.id !== selectedEntity?.id) {
        onSelectEntity?.(matchedEntity);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '系统分析加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedEntity) {
      return;
    }

    setInput(selectedEntity.name);
    void handleAnalyze(selectedEntity.name, selectedEntity);
  }, [selectedEntity?.id]);

  if (loading && !analysis) {
    return <div className="text-muted-foreground">正在加载系统分析...</div>;
  }

  if (error && !analysis) {
    return <div className="text-destructive">{error}</div>;
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-primary" />
            系统分析器
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">当前系统视图来自 WiKiMG 节点、关系和派生分析结果</span>
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
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void handleAnalyze()}
              className="flex-1"
            />
            <Button onClick={() => void handleAnalyze()} disabled={loading || !input.trim()}>
              {loading ? '分析中...' : <><Search className="w-4 h-4 mr-2" />分析</>}
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

          {error && analysis ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Boxes className="w-6 h-6 text-purple-500" />
                系统本体分析：{analysis.entity}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                基于 WiKiMG 文档节点与关联语境派生出的动态系统视图
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-purple-50">
                系统本体论
              </Badge>
              {analyzedEntity ? (
                <>
                  <Badge variant="secondary">{analyzedEntity.domain}</Badge>
                  <Badge variant={analyzedEntity.layer === 'private' ? 'destructive' : 'outline'}>
                    {layerLabels[analyzedEntity.layer]}
                  </Badge>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="holistic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="holistic"><Boxes className="w-3 h-3 mr-1" />整体性</TabsTrigger>
              <TabsTrigger value="boundary"><Circle className="w-3 h-3 mr-1" />边界</TabsTrigger>
              <TabsTrigger value="environment"><Globe className="w-3 h-3 mr-1" />环境</TabsTrigger>
              <TabsTrigger value="feedback"><RefreshCw className="w-3 h-3 mr-1" />反馈</TabsTrigger>
              <TabsTrigger value="hierarchy"><Layers className="w-3 h-3 mr-1" />层次</TabsTrigger>
              <TabsTrigger value="questions"><Target className="w-3 h-3 mr-1" />问题</TabsTrigger>
            </TabsList>

            <TabsContent value="holistic" className="space-y-4">
              <Card className="bg-purple-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    涌现属性
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.holistic_properties.map((prop, index) => (
                      <div key={prop} className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-sm">{prop}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">涌现示例</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.emergence_examples.map((example) => (
                    <div key={example} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm">{example}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="boundary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50/50">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Square className="w-4 h-4 text-blue-500" />物理边界</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{analysis.boundary.physical}</p></CardContent>
                </Card>
                <Card className="bg-green-50/50">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-green-500" />功能边界</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{analysis.boundary.functional}</p></CardContent>
                </Card>
                <Card className="bg-yellow-50/50">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Triangle className="w-4 h-4 text-yellow-500" />认知边界</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{analysis.boundary.cognitive}</p></CardContent>
                </Card>
                <Card className="bg-red-50/50">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="w-4 h-4 text-red-500" />动态边界</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{analysis.boundary.dynamic}</p></CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="environment" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    系统环境
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{analysis.environment.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">输入</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.environment.inputs.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">输出</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.environment.outputs.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50/50">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-blue-800"><RefreshCw className="w-4 h-4" />负反馈</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.feedback.negative.map((item) => <div key={item} className="text-sm p-2 bg-white rounded border border-blue-200">{item}</div>)}
                  </CardContent>
                </Card>
                <Card className="bg-red-50/50">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-red-800"><Activity className="w-4 h-4" />正反馈</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.feedback.positive.map((item) => <div key={item} className="text-sm p-2 bg-white rounded border border-red-200">{item}</div>)}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="hierarchy" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-lg">子系统</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.hierarchy.subsystems.map((item) => <div key={item} className="rounded-lg bg-muted/40 p-3 text-sm">{item}</div>)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-lg">上位系统</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {analysis.hierarchy.supersystems.map((item) => <div key={item} className="rounded-lg bg-muted/40 p-3 text-sm">{item}</div>)}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {analysis.systems_questions.map((item) => (
                    <div key={item.question} className="rounded-lg bg-muted/40 p-4">
                      <p className="font-medium">{item.question}</p>
                      <p className="text-sm text-muted-foreground mt-2">{item.analysis}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          {error && !analysis ? <p className="text-sm text-destructive mt-4">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
