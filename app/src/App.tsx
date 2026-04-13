import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { useOntologyData } from '@/hooks/useOntologyData';
import { SearchPanel } from '@/components/SearchPanel';
import { OntologyBrowser } from '@/components/OntologyBrowser';
import { KnowledgeGraph } from '@/components/KnowledgeGraph';
import { EntityDetail } from '@/components/EntityDetail';
import { StatsPanel } from '@/components/StatsPanel';
import { OntologyAnalyzer } from '@/components/OntologyAnalyzer';
import { SystemsOntologyView } from '@/components/SystemsOntologyView';
import { OntologyAssistant } from '@/components/OntologyAssistant';
import { EducationHub } from '@/components/EducationHub';
import { OntologyEditor } from '@/components/OntologyEditor';
import { AboutKnowledgeBase } from '@/components/AboutKnowledgeBase';
import { 
  BookOpen, 
  Network, 
  BarChart3,
  Database,
  Menu,
  GitBranch,
  Layers,
  Sparkles,
  Boxes,
  MessageSquareText,
  GraduationCap,
  FilePenLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { Entity, KnowledgeLayer, KnowledgeGraphData } from '@/types/ontology';

const LAYER_FILTERS: Array<{ value: 'all' | KnowledgeLayer; label: string }> = [
  { value: 'all', label: '全部层' },
  { value: 'common', label: 'Common' },
  { value: 'domain', label: 'Domain' },
  { value: 'private', label: 'Private' },
];

function buildFilteredStatistics(
  knowledgeGraph: KnowledgeGraphData | null,
  entities: Entity[],
  crossReferences: Array<{ source: string; target: string }>,
) {
  if (!knowledgeGraph) {
    return null;
  }

  const domains = [...new Set(entities.map((entity) => entity.domain).filter(Boolean))].sort();
  const levels = [...new Set(entities.map((entity) => entity.level).filter((level): level is number => typeof level === 'number'))].sort((left, right) => left - right);
  const sources = [...new Set(entities.map((entity) => entity.source).filter(Boolean))].sort();
  const layers = [...new Set(entities.map((entity) => entity.layer).filter(Boolean))] as KnowledgeLayer[];
  const orderedLayers = ['common', 'domain', 'private'].filter((layer) => layers.includes(layer as KnowledgeLayer)) as KnowledgeLayer[];
  const layerCounts = orderedLayers.reduce<Partial<Record<KnowledgeLayer, number>>>((accumulator, layer) => {
    accumulator[layer] = entities.filter((entity) => entity.layer === layer).length;
    return accumulator;
  }, {});

  return {
    ...knowledgeGraph.statistics,
    total_entities: entities.length,
    total_relations: crossReferences.length,
    domains,
    levels,
    sources,
    layers: orderedLayers,
    layer_counts: layerCounts,
  };
}

function App() {
  const { 
    knowledgeGraph, 
    loading, 
    error, 
    searchEntities
  } = useOntologyData();
  
  const entities = knowledgeGraph ? Object.values(knowledgeGraph.entity_index) : [];
  const crossReferences = knowledgeGraph?.cross_references || [];
  
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedLayer, setSelectedLayer] = useState<'all' | KnowledgeLayer>('all');

  const filteredEntities = entities.filter((entity) => (
    selectedLayer === 'all' || entity.layer === selectedLayer
  ));
  const visibleEntityIds = new Set(filteredEntities.map((entity) => entity.id));
  const filteredCrossReferences = crossReferences.filter((reference) => (
    visibleEntityIds.has(reference.source) && visibleEntityIds.has(reference.target)
  ));
  const filteredStatistics = buildFilteredStatistics(knowledgeGraph, filteredEntities, filteredCrossReferences);
  
  // 数据加载完成后自动选择第一个实体
  useEffect(() => {
    if (filteredEntities.length === 0) {
      if (selectedEntity) {
        setSelectedEntity(null);
      }
      return;
    }

    if (!selectedEntity || !filteredEntities.some((entity) => entity.id === selectedEntity.id)) {
      setSelectedEntity(filteredEntities[0]);
    }
  }, [filteredEntities, selectedEntity]);
  
  const relatedEntities = selectedEntity
    ? filteredCrossReferences
        .map((reference) => {
          const relatedId = reference.source === selectedEntity.id ? reference.target : (
            reference.target === selectedEntity.id ? reference.source : null
          );
          return relatedId ? filteredEntities.find((entity) => entity.id === relatedId) || null : null;
        })
        .filter((entity): entity is Entity => Boolean(entity))
    : [];

  const handleSearch = async (query: string) => {
    const results = await searchEntities(query);
    return results.filter((entity) => selectedLayer === 'all' || entity.layer === selectedLayer);
  };

  const handleSelectEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">正在加载 WiKiMG 多层知识图谱...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center text-destructive">
          <p className="text-lg font-semibold mb-2">加载失败</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">本体论知识库</h1>
              <p className="text-xs text-muted-foreground">Ontology Knowledge Base</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {filteredEntities.length} 实体
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Network className="w-3 h-3" />
                {filteredCrossReferences.length} 关系
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {selectedLayer === 'all' ? '全部层' : selectedLayer}
              </Badge>
            </div>
            
            <div className="hidden md:block w-72">
              <SearchPanel 
                onSearch={handleSearch}
                onSelectEntity={handleSelectEntity}
              />
            </div>
            
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="p-4 border-b">
                  <h2 className="font-semibold">本体浏览器</h2>
                </div>
                <div className="p-4">
                  <OntologyBrowser 
                    entities={filteredEntities}
                    crossReferences={filteredCrossReferences}
                    onSelectEntity={handleSelectEntity}
                    selectedEntityId={selectedEntity?.id}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
          <span className="text-sm text-muted-foreground">按存储层过滤</span>
          {LAYER_FILTERS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={selectedLayer === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLayer(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 lg:w-auto lg:inline-grid">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">浏览</span>
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <MessageSquareText className="w-4 h-4" />
              <span className="hidden sm:inline">问答</span>
            </TabsTrigger>
            <TabsTrigger value="analyzer" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">分析</span>
            </TabsTrigger>
            <TabsTrigger value="systems" className="flex items-center gap-2">
              <Boxes className="w-4 h-4" />
              <span className="hidden sm:inline">系统</span>
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <FilePenLine className="w-4 h-4" />
              <span className="hidden sm:inline">编辑</span>
            </TabsTrigger>
            <TabsTrigger value="education" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">科普</span>
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              <span className="hidden sm:inline">图谱</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">统计</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">关于</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <div className="rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white overflow-hidden">
              <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.6fr_1fr] lg:px-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
                    <BookOpen className="w-3.5 h-3.5" />
                    WiKiMG 主阅读区
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold lg:text-3xl">
                    用存储层过滤知识范围，再查看节点详情与关系网络
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm text-slate-300 lg:text-base">
                    当前页面会根据上方的层过滤展示 `common`、`domain`、`private` 中的节点。左侧用于快速比较代表节点，右侧会同步展开选中节点的定义、属性、来源和关联关系。
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-xs text-slate-300">当前实体</div>
                    <div className="mt-2 text-lg font-semibold">{selectedEntity?.name || '未选择'}</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-xs text-slate-300">当前层节点</div>
                    <div className="mt-2 text-lg font-semibold">{filteredEntities.length}</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-xs text-slate-300">当前层关系</div>
                    <div className="mt-2 text-lg font-semibold">{filteredCrossReferences.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="hidden lg:block lg:col-span-4">
                <OntologyBrowser 
                  entities={filteredEntities}
                  crossReferences={filteredCrossReferences}
                  onSelectEntity={handleSelectEntity}
                  selectedEntityId={selectedEntity?.id}
                />
              </div>

              <div className="lg:col-span-8">
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border bg-card p-4">
                    <div className="text-xs text-muted-foreground">当前阅读</div>
                    <div className="mt-2 font-medium">{selectedEntity?.name || '当前过滤范围内暂无可阅读节点'}</div>
                    <p className="mt-1 text-sm text-muted-foreground">右侧详情会跟随当前选中节点更新，并保留完整的定义、属性和关系信息。</p>
                  </div>
                  <div className="rounded-2xl border bg-card p-4">
                    <div className="text-xs text-muted-foreground">当前过滤</div>
                    <div className="mt-2 font-medium">{selectedLayer === 'all' ? '全部层' : selectedLayer}</div>
                    <p className="mt-1 text-sm text-muted-foreground">浏览、图谱、统计会一起跟着这个层过滤同步变化。</p>
                  </div>
                  <div className="rounded-2xl border bg-card p-4">
                    <div className="text-xs text-muted-foreground">左侧速览</div>
                    <div className="mt-2 font-medium">优先展示与当前节点接近的候选内容</div>
                    <p className="mt-1 text-sm text-muted-foreground">你可以先横向比较定义和领域，再决定把哪个节点切到主阅读区。</p>
                  </div>
                </div>

                <EntityDetail 
                  entity={selectedEntity}
                  relatedEntities={relatedEntities}
                  onSelectRelated={handleSelectEntity}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <OntologyAssistant selectedEntity={selectedEntity} />
          </TabsContent>

          <TabsContent value="analyzer" className="space-y-6">
            <OntologyAnalyzer
              entities={filteredEntities}
              selectedEntity={selectedEntity}
              onSelectEntity={handleSelectEntity}
            />
          </TabsContent>

          <TabsContent value="systems" className="space-y-6">
            <SystemsOntologyView
              entities={filteredEntities}
              selectedEntity={selectedEntity}
              onSelectEntity={handleSelectEntity}
            />
          </TabsContent>

          <TabsContent value="editor" className="space-y-6">
            <OntologyEditor selectedEntity={selectedEntity} />
          </TabsContent>

          <TabsContent value="education" className="space-y-6">
            <EducationHub selectedEntity={selectedEntity} />
          </TabsContent>

          <TabsContent value="graph" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <KnowledgeGraph 
                  entities={filteredEntities}
                  crossReferences={filteredCrossReferences}
                  onSelectEntity={handleSelectEntity}
                  selectedEntityId={selectedEntity?.id}
                />
              </div>
              <div className="lg:col-span-1">
                <EntityDetail 
                  entity={selectedEntity}
                  relatedEntities={relatedEntities}
                  onSelectRelated={handleSelectEntity}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <StatsPanel statistics={filteredStatistics} />
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">哲学本体论</h3>
                    <p className="text-xs text-muted-foreground">形而上学核心</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  涵盖存在论、范畴论、属性论、关系论等形而上学核心问题，
                  从巴门尼德、亚里士多德到现代分析哲学的本体论传统。
                </p>
              </div>
              
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Layers className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">形式本体论</h3>
                    <p className="text-xs text-muted-foreground">知识表示基础</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  包括BFO、DOLCE、SUMO等顶层本体，以及OWL、RDF等本体语言，
                  为知识表示和语义网提供形式化基础。
                </p>
              </div>
              
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Network className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">科学本体论</h3>
                    <p className="text-xs text-muted-foreground">层次结构</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  从物理、化学、生物到认知、社会、信息的层次结构，
                  展示从物质到意义的涌现层次。
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="about">
            <AboutKnowledgeBase />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
