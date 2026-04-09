import { useEffect, useState } from 'react';
import { FilePenLine, Braces, Save, WandSparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  fetchEditorWorkspace,
  previewEditorDraft,
  type EditorPreview,
  type EditorWorkspace,
} from '@/lib/api';
import type { Entity } from '@/types/ontology';

interface OntologyEditorProps {
  selectedEntity: Entity | null;
}

export function OntologyEditor({ selectedEntity }: OntologyEditorProps) {
  const [workspace, setWorkspace] = useState<EditorWorkspace | null>(null);
  const [preview, setPreview] = useState<EditorPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchEditorWorkspace(selectedEntity?.id)
      .then((result) => {
        if (!active) return;
        setWorkspace(result);
        setPreview(null);
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : '加载编辑器失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedEntity?.id]);

  async function handlePreview() {
    if (!workspace) return;
    setPreviewLoading(true);
    setError(null);

    try {
      const result = await previewEditorDraft({
        entityId: workspace.entity_id,
        name: workspace.name,
        type: workspace.type,
        domain: workspace.domain,
        source: workspace.source,
        definition: workspace.definition,
        propertiesText: workspace.properties_text,
      });
      setPreview(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '生成预览失败');
    } finally {
      setPreviewLoading(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">正在加载编辑工作区...</div>;
  }

  if (error && !workspace) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-destructive">{error}</div>;
  }

  if (!workspace) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">暂无可编辑内容</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
            <FilePenLine className="h-3.5 w-3.5" />
            编辑工作区
          </div>
          <CardTitle className="mt-4 text-2xl">把概念整理成后续可入库的结构</CardTitle>
          <CardDescription>
            现在是 fake repository 驱动，后面接真数据库时，这里就可以直接替换成真实保存逻辑。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium">名称</div>
                <Input
                  value={workspace.name}
                  onChange={(event) => setWorkspace({ ...workspace, name: event.target.value })}
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">来源</div>
                <Input
                  value={workspace.source}
                  onChange={(event) => setWorkspace({ ...workspace, source: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium">类型</div>
                <Input
                  value={workspace.type}
                  onChange={(event) => setWorkspace({ ...workspace, type: event.target.value })}
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">领域</div>
                <Input
                  value={workspace.domain}
                  onChange={(event) => setWorkspace({ ...workspace, domain: event.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">定义</div>
              <Textarea
                rows={6}
                value={workspace.definition}
                onChange={(event) => setWorkspace({ ...workspace, definition: event.target.value })}
              />
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">属性 JSON</div>
              <Textarea
                rows={10}
                className="font-mono text-xs"
                value={workspace.properties_text}
                onChange={(event) => setWorkspace({ ...workspace, properties_text: event.target.value })}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handlePreview} disabled={previewLoading}>
                <WandSparkles className="mr-2 h-4 w-4" />
                {previewLoading ? '生成中...' : '生成结构预览'}
              </Button>
              <Button variant="outline" disabled>
                <Save className="mr-2 h-4 w-4" />
                后续可接真实保存
              </Button>
            </div>

            {error ? <div className="text-sm text-destructive">{error}</div> : null}
          </div>

          <div className="space-y-4">
            <Card className="border-slate-200 bg-slate-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">编辑建议</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">推荐类型</div>
                  <div className="mt-2 font-medium">{workspace.suggestions.recommended_type}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">建议关联</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {workspace.suggestions.suggested_relations.map((item) => (
                      <Badge key={item} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Braces className="h-4 w-4 text-primary" />
                  结构预览
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="text-xs text-muted-foreground">RDF</div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                    {preview?.rdf || workspace.suggestions.rdf_preview}
                  </pre>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="text-xs text-muted-foreground">OWL</div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                    {preview?.owl || workspace.suggestions.owl_preview}
                  </pre>
                </div>
                {preview ? (
                  <div className="rounded-xl border bg-blue-50 p-4">
                    <div className="text-sm font-medium text-blue-950">预览说明</div>
                    <p className="mt-2 text-sm leading-6 text-blue-900/80">{preview.summary}</p>
                    {preview.warnings.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {preview.warnings.map((warning) => (
                          <div key={warning} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs text-blue-900/80">
                            {warning}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
