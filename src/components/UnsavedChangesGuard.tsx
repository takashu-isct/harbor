"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const Ctx = createContext<((key: string, dirty: boolean) => void) | null>(null);

const CONFIRM_MESSAGE = "更新していない変更があります。移動してもよろしいですか?";

// このProviderの配下に「保存されていない変更」があるあいだ、ページ離脱(リンククリック・
// タブを閉じる・更新など)を確認ダイアログでブロックする。
export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const dirtyKeys = useRef(new Set<string>());
  const [hasDirty, setHasDirty] = useState(false);

  const setDirty = useCallback((key: string, dirty: boolean) => {
    if (dirty) {
      dirtyKeys.current.add(key);
    } else {
      dirtyKeys.current.delete(key);
    }
    setHasDirty(dirtyKeys.current.size > 0);
  }, []);

  useEffect(() => {
    if (!hasDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement)?.closest("a[href]");
      if (!link) return;
      if (!window.confirm(CONFIRM_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [hasDirty]);

  return <Ctx.Provider value={setDirty}>{children}</Ctx.Provider>;
}

export function useUnsavedChangesGuard(key: string, dirty: boolean) {
  const setDirty = useContext(Ctx);
  useEffect(() => {
    setDirty?.(key, dirty);
    return () => setDirty?.(key, false);
  }, [setDirty, key, dirty]);
}
