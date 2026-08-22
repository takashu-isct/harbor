"use client";

import { useEffect, useState } from "react";
import { useUnsavedChangesGuard } from "./UnsavedChangesGuard";

export function RoleEditForm({
  role,
  action,
}: {
  role: { name: string; isAdmin: boolean };
  action: (formData: FormData) => void;
}) {
  const [name, setName] = useState(role.name);
  const [isAdmin, setIsAdmin] = useState(role.isAdmin);

  // 保存が成功してサーバー側のデータが更新されたら、このフォームの「変更あり」状態もリセットする。
  useEffect(() => {
    setName(role.name);
    setIsAdmin(role.isAdmin);
  }, [role.name, role.isAdmin]);

  const dirty = name !== role.name || isAdmin !== role.isAdmin;
  useUnsavedChangesGuard(`role-${role.name}`, dirty);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3 bg-surface px-4 py-3">
      <input type="hidden" name="oldName" value={role.name} />
      <input
        name="newName"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="rounded-none bg-background px-3 py-1.5 text-sm text-foreground"
      />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          name="isAdmin"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
        />
        管理者権限
      </label>
      <button
        type="submit"
        className={`rounded-none px-3 py-1.5 text-xs font-medium transition ${
          dirty ? "bg-accent text-white hover:brightness-110" : "bg-background text-muted"
        }`}
      >
        更新
      </button>
    </form>
  );
}
