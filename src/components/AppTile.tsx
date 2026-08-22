import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";

export function AppTile({
  href,
  external,
  disabled,
  icon: Icon,
  iconUrl,
  label,
  note,
  badge,
}: {
  href?: string;
  external?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  iconUrl?: string;
  label: string;
  note?: string;
  badge?: number;
}) {
  const inner = (
    <div className="flex w-20 flex-col items-center gap-1.5 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-none bg-surface transition-all duration-150 ease-out group-hover:brightness-110 group-active:scale-[0.96]">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="h-8 w-8 rounded-none" />
        ) : (
          Icon && <Icon className="h-7 w-7 text-foreground" aria-hidden />
        )}
        {!!badge && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-none bg-danger px-1 text-[10px] font-semibold text-white">
            {badge}
          </span>
        )}
      </div>
      <span className="text-xs text-foreground">{label}</span>
      {note && <span className="text-[10px] text-muted">{note}</span>}
    </div>
  );

  if (disabled || !href) {
    return <div className="opacity-50">{inner}</div>;
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className="group">
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className="group">
      {inner}
    </Link>
  );
}

export function AddTile({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group flex w-20 flex-col items-center gap-1.5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-none bg-muted/15 text-muted transition-all duration-150 ease-out group-hover:brightness-110 group-active:scale-[0.96]">
        <Plus className="h-7 w-7" aria-hidden />
      </div>
      <span className="text-xs text-muted">{label}</span>
    </Link>
  );
}
