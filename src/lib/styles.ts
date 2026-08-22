// ボタン・リンクの見た目を画面間で揃えるための共通クラス。
// 角は尖らせたまま(rounded-none)、押した時に少し沈む・明るさが変わる
// アニメーションだけを共通で付ける。

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.97] active:brightness-95 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

export const btnPrimarySmall =
  "inline-flex items-center justify-center gap-1 rounded-none bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.97] active:brightness-95 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

export const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-none bg-surface px-4 py-2 text-sm font-medium text-foreground transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

export const btnSecondarySmall =
  "inline-flex items-center justify-center gap-1 rounded-none bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

export const btnDangerSmall =
  "inline-flex items-center justify-center gap-1 rounded-none bg-danger/20 px-3 py-1.5 text-xs font-medium text-danger transition-all duration-150 ease-out hover:brightness-110 hover:bg-danger/30 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

export const btnDangerXs =
  "inline-flex items-center justify-center gap-1 rounded-none bg-danger/20 px-2 py-1 text-xs text-danger transition-all duration-150 ease-out hover:brightness-110 hover:bg-danger/30 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

export const linkMuted =
  "inline-flex items-center gap-1 text-sm text-muted underline decoration-transparent underline-offset-2 transition-colors duration-150 hover:text-foreground hover:decoration-current";

export const linkMutedXs =
  "inline-flex items-center gap-1 text-xs text-muted underline decoration-transparent underline-offset-2 transition-colors duration-150 hover:text-foreground hover:decoration-current";

export const tileHover =
  "transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.98]";
