import Link from "next/link";
import { findActiveAffiliationsByEmail, findGroupById } from "@/lib/sheet";

type Current =
  | { type: "personal" }
  | { type: "org"; id: string; role: string; groupName: string };

export async function LocationSwitcher({
  email,
  current,
}: {
  email: string;
  current: Current;
}) {
  const affiliations = await findActiveAffiliationsByEmail(email);
  const orgs = await Promise.all(
    affiliations.map(async (a) => ({
      affiliation: a,
      group: await findGroupById(a.groupId),
    }))
  );

  const currentLabel =
    current.type === "personal"
      ? "個人"
      : `${current.groupName}(${current.role})`;

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-muted [&::-webkit-details-marker]:hidden">
        ステータス: <span className="text-foreground">{currentLabel}</span>
        <span className="text-muted" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="absolute left-0 top-full z-10 mt-2 w-56 border border-surface bg-background py-1 text-sm shadow-lg">
        <Link
          href="/me"
          className={`block px-3 py-2 hover:bg-surface ${
            current.type === "personal" ? "text-accent" : "text-foreground"
          }`}
        >
          🙍 個人
        </Link>
        {orgs.map(({ affiliation, group }) => (
          <Link
            key={affiliation.groupId}
            href={`/org/${affiliation.groupId}`}
            className={`block px-3 py-2 hover:bg-surface ${
              current.type === "org" && current.id === affiliation.groupId
                ? "text-accent"
                : "text-foreground"
            }`}
          >
            🏢 {group?.name ?? affiliation.groupId}({affiliation.role})
          </Link>
        ))}
      </div>
    </details>
  );
}
