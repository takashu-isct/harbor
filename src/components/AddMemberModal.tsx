"use client";

import { useRef, useState } from "react";

export function AddMemberModal({
  action,
  roles,
}: {
  action: (formData: FormData) => Promise<void> | void;
  roles: { name: string; isAdmin: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // 「メンバー」ロールが無い団体では、管理者権限ではない先頭のロールを既定でチェックする
  // (何もチェックされないまま追加され、権限0のメンバーができてしまうのを防ぐ)。
  const defaultRoleName =
    roles.find((r) => r.name === "メンバー")?.name ?? roles.find((r) => !r.isAdmin)?.name;

  async function handleSubmit(formData: FormData) {
    await action(formData);
    formRef.current?.reset();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
      >
        + メンバーを追加
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-none bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">メンバーを追加</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="text-sm text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
              <input
                name="email"
                type="email"
                placeholder="メールアドレス"
                required
                className="rounded-none bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted"
              />
              <input
                name="name"
                type="text"
                placeholder="氏名"
                required
                className="rounded-none bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted"
              />
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted">ロール</span>
                {roles.map((r) => (
                  <label key={r.name} className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      name="roles"
                      value={r.name}
                      defaultChecked={r.name === defaultRoleName}
                    />
                    {r.name}
                    {r.isAdmin && <span className="text-xs">(管理者権限)</span>}
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="self-start rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                追加
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
