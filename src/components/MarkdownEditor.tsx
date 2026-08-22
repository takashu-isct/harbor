"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { proseClass } from "@/lib/markdownProse";

export function MarkdownEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          rows={20}
          placeholder={
            "Markdownで書けます\n# 見出し\n- リスト\n**太字**"
          }
          className="rounded-none bg-surface px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted"
        />
        <div
          className={`min-h-[20rem] overflow-auto rounded-none bg-surface px-3 py-2 text-sm text-foreground ${proseClass}`}
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted">プレビューがここに表示されます</p>
          )}
        </div>
      </div>
      <span className="text-xs text-muted">左に入力すると、右にプレビューが表示されます。</span>
    </div>
  );
}
