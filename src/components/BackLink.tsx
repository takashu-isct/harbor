import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted underline decoration-transparent underline-offset-2 transition-colors duration-150 hover:text-foreground hover:decoration-current"
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </Link>
  );
}
