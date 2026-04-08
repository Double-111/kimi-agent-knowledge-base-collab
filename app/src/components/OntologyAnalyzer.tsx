import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Layers, 
  Box, 
  Link2, 
  HelpCircle, 
  FileCode, 
  Sparkles,
  ChevronRight,
  Circle,
  Square,
  Triangle
} from 'lucide-react';

interface AnalysisResult {
  entity_name: string;
  primary_level: string;
  secondary_levels: string[];
  ontology_breakdown: {
    entity_level: {
      main_level: string;
      physical_basis: string;
      social_dimension?: string;
    };
    essential_attributes: Array<{
      attribute: string;
      description: string;
      necessity: string;
    }>;
    accidental_attributes: Array<{
      attribute: string;
      examples: string[];
    }>;
    components: Array<{
      part: string;
      function: string;
      material?: string;
      ontology_relation: string;
    }>;
    relations: Array<{
      relation: string;
      target: string;
      description: string;
    }>;
    ontological_questions: Array<{
      question: string;
      discussion: string;
    }>;
    formalization: {
      RDF?: string;
      OWL?: string;
      description_logic?: string;
    };
  };
}

interface OntologyAnalyzerProps {
  onSelectConcept: (concept: string) => void;
}

// 预定义的分析示例
const exampleAnalyses: Record<string, AnalysisResult> = {
  "自行车": {
    entity_name: "自行车",
    primary_level: "人工层",
    secondary_levels: ["物理层", "社会层"],
    ontology_breakdown: {
      entity_level: {
        main_level: "人工层（工具/机器）",
        physical_basis: "物质实体（金属、橡胶等材料）",
        social_dimension: "交通工具、运动器材、文化符号"
      },
      essential_attributes: [
        { attribute: "双轮结构", description: "两个轮子的基本配置", necessity: "必要" },
        { attribute: "人力驱动", description: "通过脚踏板驱动", necessity: "典型但非必要" },
        { attribute: "转向机制", description: "通过车把控制方向", necessity: "必要" },
        { attribute: "运输功能", description: "运送人员或物品", necessity: "核心功能" }
      ],
      accidental_attributes: [
        { attribute: "颜色", examples: ["红色", "蓝色", "黑色"] },
        { attribute: "尺寸", examples: ["20寸", "26寸", "29寸"] },
        { attribute: "材质", examples: ["钢", "铝", "碳纤维"] },
        { attribute: "品牌", examples: ["捷安特", "美利达", "永久"] }
      ],
      components: [
        { part: "车架", function: "主体支撑结构", material: "金属/碳纤维", ontology_relation: "整体-部分" },
        { part: "车轮", function: "滚动移动", material: "橡胶轮胎+金属轮圈", ontology_relation: "整体-部分" },
        { part: "传动系统", function: "传递动力", ontology_relation: "整体-部分" },
        { part: "转向系统", function: "控制方向", ontology_relation: "整体-部分" },
        { part: "制动系统", function: "减速停止", ontology_relation: "整体-部分" }
      ],
      relations: [
        { relation: "功能实现", target: "运输", description: "自行车实现运输功能" },
        { relation: "社会角色", target: "交通工具", description: "作为交通系统的一部分" },
        { relation: "文化意义", target: "环保/健康", description: "象征环保生活方式" },
        { relation: "经济价值", target: "商品", description: "可买卖的商品" },
        { relation: "使用关系", target: "骑行者", description: "人与自行车的互动" }
      ],
      ontological_questions: [
        { 
          question: "自行车的本质是什么？", 
          discussion: "是其物理结构还是其功能？如果去除轮子还是自行车吗？" 
        },
        { 
          question: "自行车的同一性如何确定？", 
          discussion: "更换所有零件后还是同一辆自行车吗？（忒修斯之船问题）" 
        },
        { 
          question: "自行车作为人工制品的本体地位", 
          discussion: "其存在依赖于设计意图还是物理实例？" 
        }
      ],
      formalization: {
        RDF: "<自行车> rdf:type <人工制品>, <交通工具> .",
        OWL: "Class: 自行车 SubClassOf: 具有双轮结构 and 具有运输功能",
        description_logic: "自行车 ≡ 人工制品 ⊓ ∃hasPart.轮子 ⊓ ∃hasFunction.运输"
      }
    }
  },
  
  "手机": {
    entity_name: "手机",
    primary_level: "人工层",
    secondary_levels: ["物理层", "信息层", "社会层"],
    ontology_breakdown: {
      entity_level: {
        main_level: "人工层（电子设备）",
        physical_basis: "电子元件、电池、屏幕",
        social_dimension: "社交工具、身份象征"
      },
      essential_attributes: [
        { attribute: "移动通信", description: "无线通信能力", necessity: "必要" },
        { attribute: "计算处理", description: "运行应用程序", necessity: "必要" },
        { attribute: "便携性", description: "可随身携带", necessity: "必要" }
      ],
      accidental_attributes: [
        { attribute: "屏幕尺寸", examples: ["5寸", "6寸", "折叠屏"] },
        { attribute: "操作系统", examples: ["iOS", "Android", "鸿蒙"] },
        { attribute: "颜色", examples: ["黑色", "白色", "金色"] },
        { attribute: "存储容量", examples: ["64GB", "256GB", "512GB"] }
      ],
      components: [
        { part: "处理器", function: "计算核心", ontology_relation: "整体-部分" },
        { part: "屏幕", function: "显示输出", ontology_relation: "整体-部分" },
        { part: "电池", function: "能源供应", ontology_relation: "整体-部分" },
        { part: "摄像头", function: "图像采集", ontology_relation: "整体-部分" },
        { part: "通信模块", function: "网络连接", ontology_relation: "整体-部分" }
      ],
      relations: [
        { relation: "功能实现", target: "通信", description: "实现远程通信" },
        { relation: "信息处理", target: "计算", description: "信息处理设备" },
        { relation: "社会连接", target: "社交网络", description: "连接人与人" },
        { relation: "经济角色", target: "消费品", description: "电子消费品" }
      ],
      ontological_questions: [
        { 
          question: "智能手机的本质是硬件还是软件？", 
          discussion: "如果更换操作系统，还是同一部手机吗？" 
        },
        { 
          question: "手机中的'我'在哪里？", 
          discussion: "数据、账号、个性化设置构成了数字身份" 
        }
      ],
      formalization: {
        RDF: "<手机> rdf:type <电子设备>, <通信设备> .",
        OWL: "Class: 手机 SubClassOf: 具有通信功能 and 具有计算功能",
        description_logic: "手机 ≡ 电子设备 ⊓ ∃hasFunction.通信 ⊓ ∃hasFunction.计算"
      }
    }
  },
  
  "公司": {
    entity_name: "公司",
    primary_level: "社会层",
    secondary_levels: ["信息层", "法律层"],
    ontology_breakdown: {
      entity_level: {
        main_level: "社会层（制度实体）",
        physical_basis: "集体意向性实体",
        social_dimension: "依赖法律体系和人类认知"
      },
      essential_attributes: [
        { attribute: "法律人格", description: "具有法律主体地位", necessity: "必要" },
        { attribute: "组织目标", description: "追求特定经济或社会目标", necessity: "必要" },
        { attribute: "成员结构", description: "由员工、股东等组成", necessity: "必要" }
      ],
      accidental_attributes: [
        { attribute: "规模", examples: ["初创", "中小企业", "跨国集团"] },
        { attribute: "行业", examples: ["科技", "金融", "制造", "服务"] },
        { attribute: "所有制", examples: ["私营", "国有", "上市"] }
      ],
      components: [
        { part: "员工", function: "执行组织任务", ontology_relation: "集体-成员" },
        { part: "管理层", function: "决策和协调", ontology_relation: "集体-成员" },
        { part: "资产", function: "运营资源", ontology_relation: "拥有-被拥有" },
        { part: "品牌", function: "身份识别", ontology_relation: "代表-被代表" }
      ],
      relations: [
        { relation: "制度依赖", target: "法律体系", description: "依赖法律承认" },
        { relation: "经济功能", target: "市场", description: "参与市场活动" },
        { relation: "雇佣关系", target: "员工", description: "雇佣员工" },
        { relation: "所有权", target: "股东", description: "股东拥有股份" }
      ],
      ontological_questions: [
        { 
          question: "公司是实在的吗？", 
          discussion: "作为制度实体，其存在依赖于集体意向性（约翰·塞尔理论）" 
        },
        { 
          question: "公司的边界在哪里？", 
          discussion: "子公司、外包、合作伙伴的界限问题" 
        }
      ],
      formalization: {
        RDF: "<公司> rdf:type <制度实体>, <经济组织> .",
        OWL: "Class: 公司 SubClassOf: 具有法律人格 and 具有组织目标",
        description_logic: "公司 ≡ 制度实体 ⊓ ∃hasStatus.法律承认 ⊓ ∃hasMember.人"
      }
    }
  }
};

// 通用分析模板（用于未知事物）
function generateGenericAnalysis(entityName: string): AnalysisResult {
  return {
    entity_name: entityName,
    primary_level: "待分析",
    secondary_levels: ["待识别"],
    ontology_breakdown: {
      entity_level: {
        main_level: "需要进一步分析确定",
        physical_basis: "检查是否有物质构成",
        social_dimension: "检查是否涉及社会制度"
      },
      essential_attributes: [
        { attribute: "核心功能", description: "该事物的根本用途是什么？", necessity: "待确定" },
        { attribute: "本质结构", description: "定义该事物的基本结构是什么？", necessity: "待确定" }
      ],
      accidental_attributes: [
        { attribute: "外观特征", examples: ["颜色", "形状", "大小"] },
        { attribute: "可变属性", examples: ["位置", "状态", "拥有者"] }
      ],
      components: [
        { part: "主要组成部分", function: "待识别", ontology_relation: "整体-部分" }
      ],
      relations: [
        { relation: "功能关系", target: "待识别", description: "该事物实现什么功能？" },
        { relation: "社会关系", target: "待识别", description: "该事物在社会中扮演什么角色？" }
      ],
      ontological_questions: [
        { 
          question: `${entityName}的本质是什么？`, 
          discussion: "需要深入分析该事物的根本属性" 
        },
        { 
          question: `${entityName}如何获得其同一性？`, 
          discussion: "什么属性变化会导致它不再是它？" 
        }
      ],
      formalization: {
        RDF: `<${entityName}> rdf:type <待定义类> .`,
        OWL: `Class: ${entityName} SubClassOf: <待定义>`,
        description_logic: `${entityName} ≡ <待定义>`
      }
    }
  };
}

export function OntologyAnalyzer({ onSelectConcept }: OntologyAnalyzerProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!input.trim()) return;
    
    setIsAnalyzing(true);
    
    // 模拟分析过程
    setTimeout(() => {
      const analysis = exampleAnalyses[input.trim()] || generateGenericAnalysis(input.trim());
      setResult(analysis);
      setIsAnalyzing(false);
      // 调用回调函数通知父组件
      onSelectConcept(input.trim());
    }, 800);
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    const analysis = exampleAnalyses[example];
    if (analysis) {
      setResult(analysis);
    }
  };

  return (
    <div className="space-y-6">
      {/* 输入区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            本体分析器
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="输入任何事物（如：自行车、手机、公司...）"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className="flex-1"
            />
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !input.trim()}
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  分析中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  分析
                </>
              )}
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">示例:</span>
            {Object.keys(exampleAnalyses).map((example) => (
              <Badge 
                key={example}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 分析结果 */}
      {result && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{result.entity_name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default">{result.primary_level}</Badge>
                  {result.secondary_levels.map((level, i) => (
                    <Badge key={i} variant="outline">{level}</Badge>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Layers className="w-8 h-8 text-primary" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="attributes">属性</TabsTrigger>
                <TabsTrigger value="components">构成</TabsTrigger>
                <TabsTrigger value="relations">关系</TabsTrigger>
                <TabsTrigger value="formal">形式化</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Circle className="w-4 h-4" />
                        主要层次
                      </h4>
                      <p className="text-sm">{result.ontology_breakdown.entity_level.main_level}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Square className="w-4 h-4" />
                        物理基础
                      </h4>
                      <p className="text-sm">{result.ontology_breakdown.entity_level.physical_basis}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <Triangle className="w-4 h-4" />
                        社会维度
                      </h4>
                      <p className="text-sm">{result.ontology_breakdown.entity_level.social_dimension || '无'}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HelpCircle className="w-5 h-5" />
                      本体论问题
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.ontology_breakdown.ontological_questions.map((q, i) => (
                        <div key={i} className="bg-muted/50 p-4 rounded-lg">
                          <p className="font-medium text-primary mb-1">{q.question}</p>
                          <p className="text-sm text-muted-foreground">{q.discussion}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attributes" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">本质属性</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.ontology_breakdown.essential_attributes.map((attr, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                            <div>
                              <p className="font-medium">{attr.attribute}</p>
                              <p className="text-sm text-muted-foreground">{attr.description}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {attr.necessity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">偶然属性</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.ontology_breakdown.accidental_attributes.map((attr, i) => (
                          <div key={i} className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium mb-2">{attr.attribute}</p>
                            <div className="flex flex-wrap gap-1">
                              {attr.examples.map((ex, j) => (
                                <Badge key={j} variant="secondary" className="text-xs">
                                  {ex}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="components">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Box className="w-5 h-5" />
                      构成部分
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.ontology_breakdown.components.map((comp, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-semibold text-primary">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{comp.part}</span>
                              <Badge variant="outline" className="text-xs">
                                {comp.ontology_relation}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              功能: {comp.function}
                              {comp.material && ` | 材料: ${comp.material}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="relations">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Link2 className="w-5 h-5" />
                      关系网络
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.ontology_breakdown.relations.map((rel, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 flex-1">
                            <Badge>{result.entity_name}</Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <Badge variant="secondary">{rel.relation}</Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <Badge variant="outline">{rel.target}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex-1">
                            {rel.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="formal">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileCode className="w-5 h-5" />
                      形式化表示
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.ontology_breakdown.formalization.RDF && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">RDF</h4>
                        <code className="block bg-muted p-3 rounded-lg text-sm">
                          {result.ontology_breakdown.formalization.RDF}
                        </code>
                      </div>
                    )}
                    {result.ontology_breakdown.formalization.OWL && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">OWL</h4>
                        <code className="block bg-muted p-3 rounded-lg text-sm">
                          {result.ontology_breakdown.formalization.OWL}
                        </code>
                      </div>
                    )}
                    {result.ontology_breakdown.formalization.description_logic && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-2">描述逻辑</h4>
                        <code className="block bg-muted p-3 rounded-lg text-sm">
                          {result.ontology_breakdown.formalization.description_logic}
                        </code>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
