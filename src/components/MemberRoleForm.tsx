"use client";

import { useEffect, useState } from "react";
import { useUnsavedChangesGuard } from "./UnsavedChangesGuard";
import { SubmitButton } from "./SubmitButton";

export function MemberRoleForm({
  email,
  roles,
  memberRoles,
  action,
}: {
  email: string;
  roles: { name: string; isAdmin: boolean }[];
  memberRoles: string[];
  action: (formData: FormData) => void;
}) {
  const [selected, setSelected] = useState<string[]>(memberRoles);

  // 保存が成功してサーバー側のデータが更新されたら、このフォームの「変更あり」状態もリセットする。
  useEffect(() => {
    setSelected(memberRoles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberRoles.join(",")]);

  const dirty =
    [...selected].sort().join(",") !== [...memberRoles].sort().join(",");

  useUnsavedChangesGuard(`member-${email}`, dirty);

  function toggle(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="email" value={email} />
      {roles.map((r) => (
        <label key={r.name} className="flex items-center gap-1 text-xs text-foreground">
          <input
            type="checkbox"
            name="roles"
            value={r.name}
            checked={selected.includes(r.name)}
            onChange={() => toggle(r.name)}
          />
          {r.name}
        </label>
      ))}
      <SubmitButton
        className={`rounded-none px-2 py-1 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:active:scale-100 ${
          dirty
            ? "bg-accent text-white hover:brightness-110"
            : "bg-surface text-muted"
        }`}
      >
        更新
      </SubmitButton>
    </form>
  );
}
