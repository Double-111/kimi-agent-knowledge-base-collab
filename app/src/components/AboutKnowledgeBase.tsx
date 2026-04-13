import { useEffect, useState } from 'react';
import { Database, Layers, Route, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchAboutContent, type AboutContent } from '@/lib/api';

export function AboutKnowledgeBase() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchAboutContent()
      .then((result) => {
        if (!active) return;
        setContent(result);
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : '加载关于信息失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">正在加载平台介绍...</div>;
  }

  if (error || !content) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-destructive">{error || '暂无平台介绍'}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            平台说明
          </div>
          <CardTitle className="mt-4 text-3xl">{content.platform.name}</CardTitle>
          <CardDescription className="text-slate-300">{content.platform.vision}</CardDescription>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">{content.platform.description}</p>
        </CardHeader>
        <CardContent className="grid gap-4 p-6 md:grid-cols-5">
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">数据源</div>
            <div className="mt-2 font-semibold">{content.metrics.provider}</div>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">实体数</div>
            <div className="mt-2 font-semibold">{content.metrics.entities}</div>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">关系数</div>
            <div className="mt-2 font-semibold">{content.metrics.relations}</div>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">领域 / 层级</div>
            <div className="mt-2 font-semibold">{content.metrics.domains} / {content.metrics.levels}</div>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">存储层</div>
            <div className="mt-2 font-semibold">{content.metrics.layers}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              当前模块
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.modules.map((module) => (
              <div key={module.name} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{module.name}</div>
                  <Badge variant="outline">{module.status}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.purpose}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Route className="h-5 w-5 text-primary" />
              建议使用路径
            </CardTitle>
            <CardDescription>从浏览、分析到编辑，按这个顺序可以更快理解这套知识平台的能力边界。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {content.workflow.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-2xl border bg-slate-50 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-primary" />
            接下来怎么往真数据库走
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {content.roadmap.map((item) => (
            <div key={item.title} className="rounded-2xl border bg-slate-50 p-4">
              <div className="font-medium">{item.title}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
