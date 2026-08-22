import type { LucideIcon } from "lucide-react";
import { Briefcase, Calendar, CircleUser, FileText, HardDrive, Wallet } from "lucide-react";

export type ToolTile = {
  id: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  href?: (id: string) => string;
};

export const ORG_TOOLS: ToolTile[] = [
  { id: "accounting", icon: Wallet, label: "会計", href: (id) => `/org/${id}/accounting` },
  { id: "drive", icon: HardDrive, label: "Drive", href: (id) => `/org/${id}/drive` },
  { id: "documents", icon: FileText, label: "文書管理", href: (id) => `/org/${id}/documents` },
  { id: "events", icon: Calendar, label: "イベント", href: (id) => `/org/${id}/events` },
];

export const PERSONAL_TOOLS: ToolTile[] = [
  { id: "profile", icon: CircleUser, label: "プロフィール", href: () => "/me/profile" },
  { id: "events", icon: Calendar, label: "イベント", href: () => "/me/events" },
  { id: "job-support", icon: Briefcase, label: "就活支援", disabled: true },
];

// 保存された表示順(ツールID配列)に沿って並び替える。
// 未登録のツールIDは無視し、順に含まれないツールは元の配列順のまま末尾に追加する
// (新しく増えたツールが自動的に一番下に出るようにするため)。
export function orderTools(tools: ToolTile[], savedOrder: string[]): ToolTile[] {
  const byId = new Map(tools.map((t) => [t.id, t]));
  const known = savedOrder.filter((id) => byId.has(id));
  const knownSet = new Set(known);
  const missing = tools.filter((t) => !knownSet.has(t.id)).map((t) => t.id);
  return [...known, ...missing].map((id) => byId.get(id)!);
}
