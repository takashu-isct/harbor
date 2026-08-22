import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findDocumentsByGroup,
  findGroupById,
  findRoles,
  hasAdminRole,
} from "@/lib/sheet";
import { buildCategoryTree, type CategoryNode } from "@/lib/documentCategory";

function TreeNode({
  groupId,
  node,
  activePath,
}: {
  groupId: string;
  node: CategoryNode;
  activePath: string[];
}) {
  const href = `/org/${groupId}/documents/category/${node.path
    .map(encodeURIComponent)
    .join("/")}`;
  const isActive = node.path.join("/") === activePath.join("/");
  const containsActive = node.path.every((p, i) => activePath[i] === p);

  const label = (
    <Link
      href={href}
      className={`flex items-center gap-1 truncate px-2 py-1 text-sm transition hover:bg-surface ${
        isActive ? "bg-surface text-accent" : "text-foreground"
      }`}
    >
      <span aria-hidden>📁</span>
      <span className="truncate">{node.name}</span>
      {node.count > 0 && (
        <span className="ml-auto shrink-0 text-xs text-muted">{node.count}</span>
      )}
    </Link>
  );

  if (node.children.length === 0) {
    return label;
  }

  return (
    <details open={containsActive || undefined}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {label}
      </summary>
      <div className="ml-3 border-l border-surface pl-2">
        {node.children.map((c) => (
          <TreeNode key={c.name} groupId={groupId} node={c} activePath={activePath} />
        ))}
      </div>
    </details>
  );
}

export async function DocumentsLayout({
  groupId,
  activePath,
  children,
}: {
  groupId: string;
  activePath: string[];
  children: ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email ?? "";

  const [affiliations, group, allRoles] = await Promise.all([
    findActiveAffiliationsByEmail(email),
    findGroupById(groupId),
    findRoles(groupId),
  ]);
  const affiliation = affiliations.find((a) => a.groupId === groupId);
  const roles = affiliation?.roles ?? [];
  const isAdmin = affiliation ? await hasAdminRole(groupId, roles) : false;
  const allDocuments = await findDocumentsByGroup(groupId);

  const roots = isAdmin ? allRoles.map((r) => r.name) : roles;
  const tree = buildCategoryTree(
    roots,
    allDocuments.map((m) => m.category)
  );

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-surface px-4 py-6 md:w-64 md:border-b-0 md:border-r">
        <Link href={`/org/${groupId}`} className="text-sm text-muted underline">
          ← {group?.name ?? groupId}
        </Link>
        <h2 className="mb-2 mt-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <span aria-hidden>📝</span>
          文書管理
        </h2>
        <nav className="flex flex-col gap-0.5">
          {tree.length === 0 ? (
            <p className="text-xs text-muted">アクセスできるフォルダがありません。</p>
          ) : (
            tree.map((node) => (
              <TreeNode key={node.name} groupId={groupId} node={node} activePath={activePath} />
            ))
          )}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col gap-6 px-6 py-6">{children}</div>
    </div>
  );
}
