export type ToolTile = {
  id: string;
  icon: string;
  label: string;
  disabled?: boolean;
  href?: (id: string) => string;
};

export const ORG_TOOLS: ToolTile[] = [
  { id: "accounting", icon: "💰", label: "会計", href: (id) => `/org/${id}/accounting` },
  { id: "drive", icon: "📁", label: "Drive", disabled: true },
  { id: "documents", icon: "📝", label: "文書管理", href: (id) => `/org/${id}/documents` },
  { id: "events", icon: "📅", label: "イベント", disabled: true },
  { id: "events-new", icon: "🎉", label: "イベントを企画する", href: (id) => `/org/${id}/events/new` },
];

export const PERSONAL_TOOLS: ToolTile[] = [
  { id: "profile", icon: "🙍", label: "プロフィール", href: () => "/me/profile" },
  { id: "events", icon: "📅", label: "参加イベント", disabled: true },
  { id: "events-new", icon: "🎉", label: "イベントを企画する", href: () => "/me/events/new" },
  { id: "job-support", icon: "💼", label: "就活支援", disabled: true },
];
