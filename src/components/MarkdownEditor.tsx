"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { proseClass } from "@/lib/markdownProse";
import { useUnsavedChangesGuard } from "./UnsavedChangesGuard";

// プレビューのMarkdown解析は入力のたびに毎回走らせず、タイピングが止まってから
// 少し待って反映する(高速に打ち続けている間は再計算しない)。
const PREVIEW_DEBOUNCE_MS = 250;

export function MarkdownEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const initial = defaultValue ?? "";
  const [value, setValue] = useState(initial);
  const [previewValue, setPreviewValue] = useState(initial);
  useUnsavedChangesGuard("document-content", value !== initial);

  useEffect(() => {
    const timer = setTimeout(() => setPreviewValue(value), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        <textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          placeholder={
            "Markdownで書けます\n# 見出し\n- リスト\n**太字**"
          }
          className="min-h-64 flex-1 resize-none rounded-none bg-surface px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted"
        />
        <div
          className={`min-h-64 flex-1 overflow-auto rounded-none bg-surface px-3 py-2 text-sm text-foreground ${proseClass}`}
        >
          {previewValue.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewValue}</ReactMarkdown>
          ) : (
            <p className="text-muted">プレビューがここに表示されます</p>
          )}
        </div>
      </div>
      <span className="shrink-0 text-xs text-muted">左に入力すると、右にプレビューが表示されます。</span>
    </div>
  );
}
