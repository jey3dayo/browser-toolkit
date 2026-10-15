const LINK_FORMATS = [
  "url",
  "text",
  "markdown",
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
  "html",
];

export const LINK_FORMAT_OPTIONS: ReadonlyArray<{
  value: LinkFormat;
  label: string;
}> = [
  { label: "URL", value: "url" },
  { label: "テキスト（タイトル + URL）", value: "text" },
  { label: "Markdown", value: "markdown" },
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

const LINK_FORMATTERS: Record<LinkFormat, LinkFormatter> = {
  bbcode: (url, title) =>
    title ? `[url=${url}]${title}[/url]` : `[url]${url}[/url]`,
  html: (url, title) =>
    `<a href="${escapeHtmlAttribute(url)}">${escapeHtmlText(title || url)}</a>`,
  markdown: (url, title) =>
    title ? `[${escapeMarkdownLinkText(title)}](<${url}>)` : `<${url}>`,
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
