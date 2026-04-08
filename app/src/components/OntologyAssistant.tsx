import { useState } from 'react';
import { Loader2, MessageSquareText, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { askOntologyAssistant } from '@/lib/api';
import type { Entity } from '@/types/ontology';

interface OntologyAssistantProps {
  selectedEntity: Entity | null;
}

export function OntologyAssistant({ selectedEntity }: OntologyAssistantProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [relatedNames, setRelatedNames] = useState<string[]>([]);

  const examples = selectedEntity
    ? [
        `请解释“${selectedEntity.name}”的定义与本体位置`,
        `“${selectedEntity.name}”和相关概念之间有什么关系？`,
        `如果我要向初学者介绍“${selectedEntity.name}”，应该怎么说？`,
      ]
    : [
        '这个知识库主要覆盖哪些本体论主题？',
        '请用通俗语言解释本体论是什么',
        '知识图谱中的领域和层次分别是什么意思？',
      ];

  const handleAsk = async (nextQuestion?: string) => {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await askOntologyAssistant({
        question: prompt,
        entityId: selectedEntity?.id,
      });

      setQuestion(prompt);
      setAnswer(result.answer || 'QAgent 没有返回可显示的回答。');
      setRelatedNames(result.context?.related?.map((entity) => entity.name) ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '请求失败');
      setAnswer('');
      setRelatedNames([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5" />
            QAgent 问答
          </CardTitle>
          <CardDescription>
            通过 QAgent + LLM 基于当前知识库上下文回答问题。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">当前实体</span>
              {selectedEntity ? (
                <Badge variant="secondary">{selectedEntity.name}</Badge>
              ) : (
                <Badge variant="outline">未选择</Badge>
              )}
            </div>
            <Textarea
              placeholder="输入你的问题，比如：形式本体论和哲学本体论有什么区别？"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="min-h-40"
            />
          </div>

          <Button onClick={() => handleAsk()} disabled={loading || !question.trim()} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'QAgent 思考中...' : '提交问题'}
          </Button>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">快捷问题</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAsk(example)}
                  disabled={loading}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>回答结果</CardTitle>
          <CardDescription>
            后端会把当前实体和相关命中一起交给 QAgent。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {answer ? (
            <div className="rounded-lg bg-muted/40 p-4 whitespace-pre-wrap leading-7">
              {answer}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              提问后会在这里显示 QAgent 的回答。
            </div>
          )}

          {relatedNames.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">本次回答参考的相关实体</p>
              <div className="flex flex-wrap gap-2">
                {relatedNames.map((name) => (
                  <Badge key={name} variant="outline">{name}</Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
