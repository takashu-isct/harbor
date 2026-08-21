// 議事録のカテゴリはesaのような "ロール名/サブカテゴリ/..." というスラッシュ区切りの階層。
// 先頭のセグメントは必ず団体のロール名と一致させ、書き込み・閲覧の範囲をロールに紐づける。

export function splitCategory(category: string): string[] {
  return category
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinCategory(segments: string[]): string {
  return segments.join("/");
}

export function canAccessTop(top: string, userRoles: string[], isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return !!top && userRoles.includes(top);
}

export function canAccessCategory(
  category: string,
  userRoles: string[],
  isAdmin: boolean
): boolean {
  return canAccessTop(splitCategory(category)[0] ?? "", userRoles, isAdmin);
}

// 与えられたprefix配下にある「次の1階層のフォルダ名」の一覧(重複なし・ソート済み)
export function childFolders(allCategories: string[], prefix: string[]): string[] {
  const names = new Set<string>();
  for (const category of allCategories) {
    const segs = splitCategory(category);
    if (segs.length <= prefix.length) continue;
    if (!prefix.every((p, i) => segs[i] === p)) continue;
    names.add(segs[prefix.length]);
  }
  return [...names].sort();
}

export type CategoryNode = {
  name: string;
  path: string[];
  children: CategoryNode[];
};

// サイドバー用のツリー構造。rootsは常にフォルダとして表示する(議事録が0件でも表示させたいため)。
export function buildCategoryTree(roots: string[], allCategories: string[]): CategoryNode[] {
  function build(prefix: string[]): CategoryNode[] {
    return childFolders(allCategories, prefix).map((name) => {
      const path = [...prefix, name];
      return { name, path, children: build(path) };
    });
  }

  return [...new Set(roots)].sort().map((name) => ({
    name,
    path: [name],
    children: build([name]),
  }));
}
