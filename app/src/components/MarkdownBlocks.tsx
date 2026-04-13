import { Fragment, type ReactNode } from 'react';
import { AlertCircle, Info, Lightbulb, ShieldAlert } from 'lucide-react';
import type { MarkdownBlock, MarkdownInlineToken } from '@/types/ontology';

interface MarkdownBlocksProps {
  blocks: MarkdownBlock[];
  onSelectEntityRef?: (ref: string) => void;
}

const calloutStyles: Record<string, string> = {
  note: 'border-blue-200 bg-blue-50 text-blue-950',
  info: 'border-sky-200 bg-sky-50 text-sky-950',
  tip: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  caution: 'border-rose-200 bg-rose-50 text-rose-950',
};

const calloutIcons: Record<string, ReactNode> = {
  note: <Info className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  tip: <Lightbulb className="h-4 w-4" />,
  warning: <AlertCircle className="h-4 w-4" />,
  caution: <ShieldAlert className="h-4 w-4" />,
};

function renderInlineTokens(
  tokens: MarkdownInlineToken[] | undefined,
  onSelectEntityRef?: (ref: string) => void,
) {
  if (!tokens || tokens.length === 0) {
    return null;
  }

  return tokens.map((token, index) => {
    if (token.type === 'code') {
      return (
        <code key={index} className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-900">
          {token.text}
        </code>
      );
    }

    if (token.type === 'strong') {
      return <strong key={index} className="font-semibold text-foreground">{token.text}</strong>;
    }

    if (token.type === 'emphasis') {
      return <em key={index} className="italic">{token.text}</em>;
    }

    if (token.type === 'link') {
      if (token.target_ref && onSelectEntityRef) {
        return (
          <button
            key={index}
            type="button"
            className="text-primary underline decoration-primary/40 underline-offset-4 hover:text-primary/80"
            onClick={() => onSelectEntityRef(token.target_ref!)}
          >
            {token.text}
          </button>
        );
      }

      if (token.href) {
        return (
          <a
            key={index}
            href={token.href}
            target={token.external ? '_blank' : undefined}
            rel={token.external ? 'noreferrer' : undefined}
            className="text-primary underline decoration-primary/40 underline-offset-4 hover:text-primary/80"
          >
            {token.text}
          </a>
        );
      }
    }

    return <Fragment key={index}>{token.text}</Fragment>;
  });
}

export function MarkdownBlocks({ blocks, onSelectEntityRef }: MarkdownBlocksProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <div key={index} className="font-semibold text-slate-900">
                {renderInlineTokens(block.tokens, onSelectEntityRef) || block.text}
              </div>
            );
          case 'paragraph':
            return (
              <p key={index} className="text-sm leading-7 text-slate-700">
                {renderInlineTokens(block.tokens, onSelectEntityRef) || block.text}
              </p>
            );
          case 'list':
            return (
              <ul key={index} className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                {(block.items || []).map((item, itemIndex) => (
                  <li key={itemIndex}>
                    {renderInlineTokens(item.tokens, onSelectEntityRef) || item.text}
                  </li>
                ))}
              </ul>
            );
          case 'ordered_list':
            return (
              <ol key={index} className="list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
                {(block.items || []).map((item, itemIndex) => (
                  <li key={itemIndex}>
                    {renderInlineTokens(item.tokens, onSelectEntityRef) || item.text}
                  </li>
                ))}
              </ol>
            );
          case 'checklist':
            return (
              <div key={index} className="space-y-2">
                {(block.items || []).map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-start gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${item.checked ? 'border-emerald-500 bg-emerald-100 text-emerald-700' : 'border-slate-300 bg-white text-slate-400'}`}>
                      {item.checked ? '✓' : ''}
                    </span>
                    <span>{renderInlineTokens(item.tokens, onSelectEntityRef) || item.text}</span>
                  </div>
                ))}
              </div>
            );
          case 'quote':
            return (
              <blockquote key={index} className="rounded-r-xl border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
                {renderInlineTokens(block.tokens, onSelectEntityRef) || block.text}
              </blockquote>
            );
          case 'callout': {
            const tone = String(block.tone || 'note').toLowerCase();
            const toneClass = calloutStyles[tone] || calloutStyles.note;
            return (
              <div key={index} className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {calloutIcons[tone] || calloutIcons.note}
                  <span>{block.title || tone.toUpperCase()}</span>
                </div>
                <div className="mt-2 text-sm leading-7">
                  {renderInlineTokens(block.tokens, onSelectEntityRef) || block.text}
                </div>
              </div>
            );
          }
          case 'code':
            return (
              <div key={index} className="overflow-hidden rounded-2xl border bg-slate-950 text-slate-50">
                {block.language ? (
                  <div className="border-b border-slate-800 px-4 py-2 text-xs uppercase tracking-wider text-slate-400">
                    {block.language}
                  </div>
                ) : null}
                <pre className="overflow-x-auto p-4 text-sm leading-6">
                  <code>{block.text}</code>
                </pre>
              </div>
            );
          case 'table':
            return (
              <div key={index} className="overflow-x-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  {block.header && block.header.length > 0 ? (
                    <thead className="bg-slate-50">
                      <tr>
                        {block.header.map((cell, cellIndex) => (
                          <th key={cellIndex} className="border-b px-4 py-3 text-left font-medium text-slate-700">
                            {renderInlineTokens(cell.tokens, onSelectEntityRef) || cell.text}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {(block.rows || []).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-3 align-top text-slate-700">
                            {renderInlineTokens(cell.tokens, onSelectEntityRef) || cell.text}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
