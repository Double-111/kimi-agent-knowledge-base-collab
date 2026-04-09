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
                    知识库主阅读区
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold lg:text-3xl">
                    左侧直接看概念摘要，右侧同步展开完整详情
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm text-slate-300 lg:text-base">
                    页面打开后，左侧会直接列出几个核心概念的定义摘要，右侧保留主阅读区。你不需要先操作，就能同时看到概览和详细解释。
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-xs text-slate-300">当前实体</div>
                    <div className="mt-2 text-lg font-semibold">{selectedEntity?.name || '未选择'}</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-xs text-slate-300">知识节点</div>
                    <div className="mt-2 text-lg font-semibold">{entities.length}</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-xs text-slate-300">概念关系</div>
                    <div className="mt-2 text-lg font-semibold">{crossReferences.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="hidden lg:block lg:col-span-4">
                <OntologyBrowser 
                  entities={entities}
                  crossReferences={crossReferences}
                  onSelectEntity={handleSelectEntity}
                  selectedEntityId={selectedEntity?.id}
                />
              </div>

              <div className="lg:col-span-8">
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border bg-card p-4">
                    <div className="text-xs text-muted-foreground">当前阅读</div>
                    <div className="mt-2 font-medium">{selectedEntity?.name || '系统已默认选中一个概念'}</div>
                    <p className="mt-1 text-sm text-muted-foreground">打开页面后就可以直接看，不需要先操作。</p>
                  </div>
                  <div className="rounded-2xl border bg-card p-4">
                    <div className="text-xs text-muted-foreground">左侧速览</div>
                    <div className="mt-2 font-medium">多个概念摘要直接常驻显示</div>
                    <p className="mt-1 text-sm text-muted-foreground">不用点开，也能先扫一眼差异和主题。</p>
                  </div>
                  <div className="rounded-2xl border bg-card p-4">
                    <div className="text-xs text-muted-foreground">切换方式</div>
                    <div className="mt-2 font-medium">点击“设为主阅读”时才切换右侧详情</div>
                    <p className="mt-1 text-sm text-muted-foreground">不点也能看摘要，想深入时再切换主阅读区。</p>
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
            <OntologyAnalyzer onSelectConcept={(concept) => {
              // 可以在这里添加将概念链接到知识库的逻辑
              console.log('Selected concept:', concept);
            }} />
          </TabsContent>

          <TabsContent value="systems" className="space-y-6">
            <SystemsOntologyView selectedEntity={selectedEntity} />
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
            <AboutKnowledgeBase />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
