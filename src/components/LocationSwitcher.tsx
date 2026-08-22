import Link from "next/link";
import { Building2, ChevronDown, CircleUser } from "lucide-react";
import { findActiveAffiliationsByEmail, findGroupById } from "@/lib/sheet";

type Current =
  | { type: "personal" }
  | { type: "org"; id: string; roles: string[]; groupName: string };

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
      : `${current.groupName}(${current.roles.join("・") || "所属"})`;

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-muted [&::-webkit-details-marker]:hidden">
        ステータス: <span className="text-foreground">{currentLabel}</span>
        <ChevronDown
          className="h-3.5 w-3.5 text-muted transition-transform duration-150 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="absolute left-0 top-full z-10 mt-2 w-56 border border-surface bg-background py-1 text-sm shadow-lg">
        <Link
          href="/me"
          className={`flex items-center gap-2 px-3 py-2 transition-colors duration-150 hover:bg-surface ${
            current.type === "personal" ? "text-accent" : "text-foreground"
          }`}
        >
          <CircleUser className="h-4 w-4 shrink-0" aria-hidden />
          個人
        </Link>
        {orgs.map(({ affiliation, group }) => (
          <Link
            key={affiliation.groupId}
            href={`/org/${affiliation.groupId}`}
            className={`flex items-center gap-2 px-3 py-2 transition-colors duration-150 hover:bg-surface ${
              current.type === "org" && current.id === affiliation.groupId
                ? "text-accent"
                : "text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {group?.name ?? affiliation.groupId}
              ({affiliation.roles.join("・") || "所属"})
            </span>
          </Link>
        ))}
      </div>
    </details>
  );
}
