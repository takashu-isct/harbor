import type { LucideIcon } from "lucide-react";
import { Briefcase, Calendar, CircleUser, FileText, HardDrive, PartyPopper, Wallet } from "lucide-react";

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
  { id: "events", icon: Calendar, label: "イベント", disabled: true },
  { id: "events-new", icon: PartyPopper, label: "イベントを企画する", href: (id) => `/org/${id}/events/new` },
];

export const PERSONAL_TOOLS: ToolTile[] = [
  { id: "profile", icon: CircleUser, label: "プロフィール", href: () => "/me/profile" },
  { id: "events", icon: Calendar, label: "参加イベント", disabled: true },
  { id: "events-new", icon: PartyPopper, label: "イベントを企画する", href: () => "/me/events/new" },
  { id: "job-support", icon: Briefcase, label: "就活支援", disabled: true },
];
