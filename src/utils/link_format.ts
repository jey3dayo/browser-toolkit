const LINK_FORMATS = [
  "url",
  "text",
  "markdown",
  "github",
  "html",
  "org",
  "bbcode",
] as const;

export type LinkFormat = (typeof LINK_FORMATS)[number];

export type LinkSource = {
  title: string;
  url: string;
};

const LINK_FORMAT_SET = new Set<string>(LINK_FORMATS);

export function coerceLinkFormat(value: unknown): LinkFormat | null {
  if (typeof value !== "string") {
    return null;
  }
  return LINK_FORMAT_SET.has(value) ? (value as LinkFormat) : null;
}

export const CONTEXT_MENU_LINK_FORMATS: readonly LinkFormat[] = [
  "url",
  "text",
  "markdown",
  "github",
  "html",
];

export const LINK_FORMAT_OPTIONS: ReadonlyArray<{
  value: LinkFormat;
  label: string;
}> = [
  { label: "URL", value: "url" },
  { label: "テキスト（タイトル + URL）", value: "text" },
  { label: "Markdown", value: "markdown" },
  { label: "GitHub（#番号 + タイトル）", value: "github" },
  { label: "HTML <a>", value: "html" },
  { label: "Org-mode", value: "org" },
  { label: "BBCode", value: "bbcode" },
];

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeMarkdownLinkText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

type LinkFormatter = (url: string, title: string) => string;

function formatMarkdownLink(url: string, title: string): string {
  return title ? `[${escapeMarkdownLinkText(title)}](<${url}>)` : `<${url}>`;
}

const GITHUB_PR_ISSUE_URL_PATTERN =
  /^https:\/\/github\.com\/[^/]+\/[^/]+\/(pull|issues)\/(\d+)(?:[?#].*)?$/;

// GitHub のタブタイトルは PR が "タイトル by 著者 · Pull Request #123 · owner/repo · GitHub"、
// Issue が "タイトル · Issue #123 · owner/repo · GitHub" という形式になる。
// 末尾のメタ情報を取り除き、タイトル本文だけを残す。著者名は PR のサフィックスが
// 実際に付いていた場合のみ落とす（タイトル本文が "by ..." で終わるケースを壊さない）。
// 末尾の " #123" は URL の番号と一致する場合のみ落とす（本文中の参照番号を誤って消さない）。
function cleanGitHubTitle(
  title: string,
  number: string,
  isPullRequest: boolean
): string {
  const suffixPattern = new RegExp(
    `\\s*·\\s*(?:Pull Request|Issue) #${number} · [^·]+$`
  );
  let cleaned = title.replace(/\s*·\s*GitHub$/, "");
  const hadSuffix = suffixPattern.test(cleaned);
  cleaned = cleaned.replace(suffixPattern, "");
  if (isPullRequest && hadSuffix) {
    cleaned = cleaned.replace(/\s+by\s+\S+$/, "");
  }
  return cleaned.replace(new RegExp(`\\s+#${number}$`), "").trim();
}

function formatGitHubLink(url: string, title: string): string {
  const [, kind, number] = GITHUB_PR_ISSUE_URL_PATTERN.exec(url) ?? [];
  if (!number) {
    return formatMarkdownLink(url, title);
  }
  const cleanedTitle = cleanGitHubTitle(title, number, kind === "pull");
  const label = cleanedTitle ? `#${number} ${cleanedTitle}` : `#${number}`;
  return `[${escapeMarkdownLinkText(label)}](<${url}>)`;
}

const LINK_FORMATTERS: Record<LinkFormat, LinkFormatter> = {
  bbcode: (url, title) =>
    title ? `[url=${url}]${title}[/url]` : `[url]${url}[/url]`,
  github: formatGitHubLink,
  html: (url, title) =>
    `<a href="${escapeHtmlAttribute(url)}">${escapeHtmlText(title || url)}</a>`,
  markdown: formatMarkdownLink,
  org: (url, title) => (title ? `[[${url}][${title}]]` : `[[${url}]]`),
  text: (url, title) => (title ? `${title}\n${url}` : url),
  url: (url) => url,
};

export function formatLink(source: LinkSource, format: LinkFormat): string {
  const url = source.url.trim();
  if (!url) {
    return "";
  }
  // 型外の値が来た場合は従来どおり bbcode 扱いにする
  const formatter = Object.hasOwn(LINK_FORMATTERS, format)
    ? LINK_FORMATTERS[format]
    : LINK_FORMATTERS.bbcode;
  return formatter(url, source.title.trim());
}
