"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

type Item = {
  id: string;
  label: string;
  icon: ReactNode;
  defaultChecked: boolean;
};

export function ToolOrderEditor({ items }: { items: Item[] }) {
  const [order, setOrder] = useState(items.map((i) => i.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const byId = new Map(items.map((i) => [i.id, i]));

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    setOrder((prev) => {
      const next = prev.filter((id) => id !== dragId);
      next.splice(next.indexOf(targetId), 0, dragId);
      return next;
    });
    setDragId(null);
  }

  return (
    <div className="flex max-w-md flex-col gap-2">
      {order.map((id) => {
        const item = byId.get(id);
        if (!item) return null;
        return (
          <div
            key={id}
            draggable
            onDragStart={() => setDragId(id)}
            onDragOver={(e: DragEvent) => e.preventDefault()}
            onDrop={() => handleDrop(id)}
            onDragEnd={() => setDragId(null)}
            className={`flex items-center gap-3 bg-surface px-4 py-3 text-sm text-foreground transition-colors duration-150 hover:brightness-110 ${
              dragId === id ? "opacity-50" : ""
            }`}
          >
            <GripVertical
              className="h-4 w-4 shrink-0 cursor-grab text-muted active:cursor-grabbing"
              aria-hidden
            />
            <input type="checkbox" name={id} defaultChecked={item.defaultChecked} />
            {item.icon}
            <span className="flex-1">{item.label}</span>
            <input type="hidden" name="order" value={id} />
          </div>
        );
      })}
      <p className="text-xs text-muted">つまんで並び替えられます。</p>
    </div>
  );
}
