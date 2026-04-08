import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Boxes, 
  ArrowRightLeft, 
  GitMerge, 
  Target, 
  Activity,
  Layers,
  Circle,
  Square,
  Triangle,
  RefreshCw,
  Globe,
  Zap
} from 'lucide-react';

// interface SystemsAnalysisProps {
//   entityName?: string;
// }

interface SystemAnalysisData {
  entity: string;
  holistic_properties: string[];
  boundary: {
    physical?: string;
    functional?: string;
    cognitive?: string;
    dynamic?: string;
  };
  environment: {
    description: string;
    inputs: string[];
    outputs: string[];
  };
  feedback: {
    negative: string[];
    positive: string[];
  };
  hierarchy: {
    subsystems: string[];
    supersystems: string[];
  };
  emergence_examples: string[];
  systems_questions: Array<{
    question: string;
    analysis: string;
  }>;
}

const bicycleSystemsAnalysis: SystemAnalysisData = {
  entity: "自行车",
  holistic_properties: [
    "可骑行性 - 单个零件不具备，组装后才涌现",
    "动态稳定性 - 运动时的自稳定特性",
    "操控响应性 - 人车耦合系统的响应特性",
    "效率优化 - 齿轮传动系统的能量转换效率"
  ],
  boundary: {
    physical: "车架、车轮的物理轮廓",
    functional: "输入（人力）→ 输出（运动）的转换接口",
    cognitive: "人们认知中的'自行车'概念边界",
    dynamic: "骑行时人车耦合形成更大系统"
  },
  environment: {
    description: "自行车嵌入在多重环境中",
    inputs: ["人力能量", "道路信息", "维护资源", "社会规则"],
    outputs: ["位移", "热量散失", "磨损产物", "社会信号（环保意识）"]
  },
  feedback: {
    negative: [
      "平衡调节：倾斜 → 转向 → 恢复平衡（稳态）",
      "速度控制：刹车 → 减速 → 安全停止",
      "方向控制：车把调整 → 轨迹修正"
    ],
    positive: [
      "速度增加：越快越稳定（一定限度内）",
      "下坡加速：重力 → 速度 → 惯性增加"
    ]
  },
  hierarchy: {
    subsystems: [
      "传动系统（齿轮-链条-踏板）- 能量转换",
      "转向系统（车把-前叉-前轮）- 方向控制",
      "制动系统（刹车片-刹车线）- 速度控制",
      "支撑系统（车架-座椅）- 结构支撑"
    ],
    supersystems: [
      "交通系统：自行车 + 汽车 + 行人 + 道路",
      "城市系统：交通 + 建筑 + 能源 + 信息",
      "生态系统：人类活动 + 自然环境"
    ]
  },
  emergence_examples: [
    "H₂O分子 → 流动性、湿润性（水的涌现）",
    "神经元 → 意识、思维（心智的涌现）",
    "个体交易者 → 价格、市场规律（经济的涌现）",
    "车架+轮子 → 可骑行性（自行车的涌现）"
  ],
  systems_questions: [
    {
      question: "自行车的本质是其物理结构还是其功能角色？",
      analysis: "从系统本体论，自行车的本质是其在交通系统中的功能角色。物理结构只是实现方式，同样的功能可以用不同结构实现（如折叠车、电动自行车）"
    },
    {
      question: "自行车-骑行者是一个系统还是两个系统？",
      analysis: "骑行时形成耦合系统，具有涌现的操控特性（如'人车合一'的感觉）；静止时是两个独立系统。边界是动态的、功能依赖的"
    },
    {
      question: "共享单车中的'自行车'还是原来的自行车吗？",
      analysis: "在共享系统中，自行车的本体地位从'私有财产'转变为'公共服务节点'。它的意义、使用方式、维护责任都发生了系统级的改变"
    }
  ]
};

export function SystemsOntologyView() {
  const [analysis] = useState<SystemAnalysisData>(bicycleSystemsAnalysis);

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Boxes className="w-6 h-6 text-purple-500" />
                系统本体分析：{analysis.entity}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                从整体论视角理解事物的系统本质
              </p>
            </div>
            <Badge variant="outline" className="bg-purple-50">
              系统本体论
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="holistic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="holistic" className="flex items-center gap-1 text-xs">
                <Boxes className="w-3 h-3" />
                整体性
              </TabsTrigger>
              <TabsTrigger value="boundary" className="flex items-center gap-1 text-xs">
                <Circle className="w-3 h-3" />
                边界
              </TabsTrigger>
              <TabsTrigger value="environment" className="flex items-center gap-1 text-xs">
                <Globe className="w-3 h-3" />
                环境
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-1 text-xs">
                <RefreshCw className="w-3 h-3" />
                反馈
              </TabsTrigger>
              <TabsTrigger value="hierarchy" className="flex items-center gap-1 text-xs">
                <Layers className="w-3 h-3" />
                层次
              </TabsTrigger>
              <TabsTrigger value="questions" className="flex items-center gap-1 text-xs">
                <Target className="w-3 h-3" />
                问题
              </TabsTrigger>
            </TabsList>

            {/* 整体性分析 */}
            <TabsContent value="holistic" className="space-y-4">
              <Card className="bg-purple-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    涌现属性（整体大于部分之和）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.holistic_properties.map((prop, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-lg border">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-sm">{prop}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-purple-100 rounded-lg">
                    <p className="text-sm font-medium text-purple-800">
                      💡 系统论洞见：
                    </p>
                    <p className="text-sm text-purple-700 mt-1">
                      你拥有所有零件 ≠ 你拥有自行车。只有正确组装和调校后，
                      "可骑行性"这一涌现属性才会出现。
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">涌现性示例</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.emergence_examples.map((example, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm">{example}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 边界分析 */}
            <TabsContent value="boundary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Square className="w-4 h-4 text-blue-500" />
                      物理边界
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.boundary.physical}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-500" />
                      功能边界
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.boundary.functional}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-yellow-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Triangle className="w-4 h-4 text-yellow-500" />
                      认知边界
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.boundary.cognitive}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-red-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-red-500" />
                      动态边界
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.boundary.dynamic}</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>边界问题：</strong>边界是客观存在还是观察者建构？
                    自行车的边界在骑行时扩展为"人车系统"，在停放时收缩为物理轮廓。
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 环境分析 */}
            <TabsContent value="environment" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    系统嵌入的环境
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {analysis.environment.description}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4" />
                        输入（环境→系统）
                      </h4>
                      <ul className="space-y-1">
                        {analysis.environment.inputs.map((input, i) => (
                          <li key={i} className="text-sm text-green-700 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            {input}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 rotate-180" />
                        输出（系统→环境）
                      </h4>
                      <ul className="space-y-1">
                        {analysis.environment.outputs.map((output, i) => (
                          <li key={i} className="text-sm text-blue-700 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            {output}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 反馈分析 */}
            <TabsContent value="feedback" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                      <RefreshCw className="w-4 h-4" />
                      负反馈（稳定系统）
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis.feedback.negative.map((fb, i) => (
                        <div key={i} className="text-sm p-2 bg-white rounded border border-blue-200">
                          {fb}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-red-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-red-800">
                      <Activity className="w-4 h-4" />
                      正反馈（放大变化）
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysis.feedback.positive.map((fb, i) => (
                        <div key={i} className="text-sm p-2 bg-white rounded border border-red-200">
                          {fb}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 层次分析 */}
            <TabsContent value="hierarchy" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    层次嵌套结构
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* 向上层次 */}
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                        向上：自行车属于哪些更大系统？
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.hierarchy.supersystems.map((sys, i) => (
                          <Badge key={i} variant="secondary" className="px-3 py-1">
                            {sys}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* 当前系统 */}
                    <div className="flex justify-center">
                      <div className="px-6 py-3 bg-purple-100 rounded-lg border-2 border-purple-300">
                        <span className="font-semibold text-purple-800">自行车系统</span>
                      </div>
                    </div>
                    
                    {/* 向下层次 */}
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                        向下：自行车包含哪些子系统？
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {analysis.hierarchy.subsystems.map((sys, i) => (
                          <div key={i} className="text-sm p-2 bg-muted/50 rounded flex items-center gap-2">
                            <GitMerge className="w-4 h-4 text-muted-foreground" />
                            {sys}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 问题分析 */}
            <TabsContent value="questions" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    系统本体论问题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.systems_questions.map((q, i) => (
                      <div key={i} className="p-4 bg-muted/50 rounded-lg">
                        <p className="font-medium text-primary mb-2">{q.question}</p>
                        <p className="text-sm text-muted-foreground">{q.analysis}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 对比：还原论 vs 系统论 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">还原论 vs 系统论视角对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-3">🔬 还原论视角</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 自行车 = 车架 + 车轮 + 链条 + ...</li>
                <li>• 理解零件就能理解整体</li>
                <li>• 属性可以还原为部分属性</li>
                <li>• 边界是固定的物理边界</li>
                <li>• 与环境是分离的</li>
              </ul>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-700 mb-3">🌐 系统论视角</h4>
              <ul className="space-y-2 text-sm text-purple-600">
                <li>• 自行车 = 零件 + 关系 + 涌现属性</li>
                <li>• 整体产生部分没有的新属性</li>
                <li>• "可骑行性"无法还原为零件</li>
                <li>• 边界是动态的、功能依赖的</li>
                <li>• 与环境持续交换物质/能量/信息</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
