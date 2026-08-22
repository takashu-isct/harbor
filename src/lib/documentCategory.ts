// 文書のカテゴリはesaのような "ロール名/サブカテゴリ/..." というスラッシュ区切りの階層。
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

// prefix自身、またはその配下(サブフォルダ含む)にあるカテゴリかどうか
export function isUnderPrefix(category: string, prefix: string[]): boolean {
  const segs = splitCategory(category);
  return prefix.every((p, i) => segs[i] === p);
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
  count: number;
};

export type CategoryItem = { category: string; isFolder: boolean };

// サイドバー用のツリー構造。rootsは常にフォルダとして表示する(文書が0件でも表示させたいため)。
// フォルダ構造そのものは空フォルダの目印行も含めて判定するが、件数バッジは実際の文書数だけを数える。
export function buildCategoryTree(roots: string[], items: CategoryItem[]): CategoryNode[] {
  const allCategories = items.map((i) => i.category);
  const documentCategories = items.filter((i) => !i.isFolder).map((i) => i.category);

  function countUnder(prefix: string[]): number {
    return documentCategories.filter((c) => isUnderPrefix(c, prefix)).length;
  }
  function build(prefix: string[]): CategoryNode[] {
    return childFolders(allCategories, prefix).map((name) => {
      const path = [...prefix, name];
      return { name, path, children: build(path), count: countUnder(path) };
    });
  }

  return [...new Set(roots)].sort().map((name) => ({
    name,
    path: [name],
    children: build([name]),
    count: countUnder([name]),
  }));
}

// esa風の「更新時刻」相対表示(たった今 / 3分前 / 2時間前 / 6日前 / 2ヶ月前 …)
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}日前`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}ヶ月前`;
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear}年前`;
}
