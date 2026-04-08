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
import { 
  BookOpen, 
  Network, 
  BarChart3,
  Database,
  Menu,
  Search,
  GitBranch,
  Layers,
  Sparkles,
  Boxes,
  MessageSquareText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { Entity } from '@/types/ontology';

function App() {
  const { 
    knowledgeGraph, 
    loading, 
    error, 
    searchEntities, 
    getRelatedEntities 
  } = useOntologyData();
  
  const entities = knowledgeGraph ? Object.values(knowledgeGraph.entity_index) : [];
  const crossReferences = knowledgeGraph?.cross_references || [];
  
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  
  // 数据加载完成后自动选择第一个实体
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0]);
    }
  }, [entities, selectedEntity]);
  
  const relatedEntities = selectedEntity 
    ? getRelatedEntities(selectedEntity.id)
    : [];

  const handleSelectEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">加载本体论知识库...</p>
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
                {entities.length} 实体
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Network className="w-3 h-3" />
                {crossReferences.length} 关系
              </Badge>
            </div>
            
            <div className="hidden md:block w-72">
              <SearchPanel 
                onSearch={searchEntities}
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
                    entities={entities}
                    crossReferences={crossReferences}
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sidebar - Ontology Browser */}
              <div className="hidden lg:block lg:col-span-4">
                <OntologyBrowser 
                  entities={entities}
                  crossReferences={crossReferences}
                  onSelectEntity={handleSelectEntity}
                  selectedEntityId={selectedEntity?.id}
                />
              </div>

              {/* Main Content - Entity Detail */}
              <div className="lg:col-span-8">
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
            <OntologyAnalyzer onSelectConcept={(concept) => {
              // 可以在这里添加将概念链接到知识库的逻辑
              console.log('Selected concept:', concept);
            }} />
          </TabsContent>

          <TabsContent value="systems" className="space-y-6">
            <SystemsOntologyView selectedEntity={selectedEntity} />
          </TabsContent>

          <TabsContent value="graph" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <KnowledgeGraph 
                  entities={entities}
                  crossReferences={crossReferences}
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
            <StatsPanel statistics={knowledgeGraph?.statistics || null} />
            
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
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">本体论知识库</h2>
                <p className="text-lg text-muted-foreground">
                  探索世界的本体结构，从哲学到科学的知识整合
                </p>
              </div>

              <div className="bg-card border rounded-lg p-8">
                <h3 className="text-xl font-semibold mb-4">什么是本体？</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  <strong>本体论（Ontology）</strong>是研究"存在"本身的哲学分支，探讨世界的基本结构、
                  实体的本质、以及事物之间的关系。在信息科学中，本体是一种形式化的知识表示，
                  定义了特定领域中的概念、属性和关系。
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  本知识库整合了<strong>三大本体论传统</strong>：
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <span><strong>哲学本体论</strong> - 从巴门尼德、亚里士多德到现代分析哲学，探讨存在、实体、属性、关系等根本问题</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                    <span><strong>形式本体论</strong> - BFO、DOLCE、SUMO等顶层本体，以及OWL、RDF等本体语言标准</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                    <span><strong>科学本体论</strong> - 从物理、化学、生物到认知、社会、信息的六层涌现结构</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border rounded-lg p-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    如何使用
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <strong>浏览模式</strong> - 从层次树选择概念，查看详细定义
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <strong>图谱模式</strong> - 可视化探索概念间的关系网络
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <strong>搜索功能</strong> - 快速定位感兴趣的概念
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <strong>关系视图</strong> - 查看概念间的映射和关联
                    </li>
                  </ul>
                </div>

                <div className="bg-card border rounded-lg p-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    数据规模
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">实体总数</span>
                      <Badge variant="secondary">{entities.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">关系总数</span>
                      <Badge variant="secondary">{crossReferences.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">领域覆盖</span>
                      <Badge variant="secondary">{knowledgeGraph?.statistics?.domains?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">层次深度</span>
                      <Badge variant="secondary">{knowledgeGraph?.statistics?.levels?.length || 0}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  版本 1.0 | 构建日期: {new Date().toLocaleDateString('zh-CN')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  使用 React + TypeScript + Tailwind CSS 构建
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
