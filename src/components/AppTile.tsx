import Link from "next/link";

export function AppTile({
  href,
  external,
  disabled,
  icon,
  iconUrl,
  label,
  note,
}: {
  href?: string;
  external?: boolean;
  disabled?: boolean;
  icon?: string;
  iconUrl?: string;
  label: string;
  note?: string;
}) {
  const inner = (
    <div className="flex w-20 flex-col items-center gap-1.5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-none bg-surface text-2xl">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="h-8 w-8 rounded-none" />
        ) : (
          <span aria-hidden>{icon}</span>
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
      <a href={href} target="_blank" rel="noreferrer noopener">
        {inner}
      </a>
    );
  }
  return <Link href={href}>{inner}</Link>;
}

export function AddTile({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex w-20 flex-col items-center gap-1.5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-none bg-muted/15 text-3xl leading-none text-muted">
        <span aria-hidden>+</span>
      </div>
      <span className="text-xs text-muted">{label}</span>
    </Link>
  );
}
