"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  className,
  pendingText,
}: {
  children: ReactNode;
  className: string;
  pendingText?: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />}
      {pending ? (pendingText ?? children) : children}
    </button>
  );
}
