import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dirname =
  typeof import.meta.dirname === "undefined"
    ? path.dirname(fileURLToPath(import.meta.url))
    : import.meta.dirname;
const projectRoot = path.join(dirname, "..");
const sourceRoot = path.join(projectRoot, "src");

const allowedBaseUiImportFiles = new Set([
  "src/components/shared/Accordion.tsx",
  "src/components/shared/Button.tsx",
  "src/components/shared/Dialog.tsx",
  "src/components/shared/Fieldset.tsx",
  "src/components/shared/Form.tsx",
  "src/components/shared/Input.tsx",
  "src/components/shared/Popover.tsx",
  "src/components/shared/RadioFieldset.tsx",
  "src/components/shared/ScrollArea.tsx",
  "src/components/shared/Select.tsx",
  "src/components/shared/Separator.tsx",
  "src/components/shared/Switch.tsx",
  "src/components/shared/Tabs.tsx",
  "src/components/shared/Toggle.tsx",
  "src/components/shared/Tooltip.tsx",
  "src/ui/toast.tsx",
]);
const allowedLucideImportFiles = new Set(["src/components/icon.tsx"]);
const allowedNativeInputFiles = new Set(["src/components/shared/Checkbox.tsx"]);
const allowedNativePreFiles = new Set(["src/components/shared/TextOutput.tsx"]);
const allowedNativeTextareaFiles = new Set([
  "src/components/shared/Textarea.tsx",
]);
// Matches `import ... from "@base-ui/react"` and subpath specifiers such as
// `@base-ui/react/dialog`. Scans import statements textually to stay decoupled
// from the `typescript` programmatic API (removed from TS7's main entry).
const baseUiImportPattern = /\bfrom\s+["']@base-ui\/react(?:\/[^"']*)?["']/;
const directTextSurfaceClassPattern =
  /className=["'][^"']*(?:summary-output|prompt-input|mbu-overlay-(?:chat-input|chat-text|primary-text|secondary-text))(?:\s|["'])/;
const directFieldClassPattern =
  /className=["'][^"']*(?:field|field-name|field-row)(?:\s|["'])/;
const directLayoutWrapperPattern =
  /<div\s+className=["'](?:action-buttons|action-item|button-row|action-row|row-between|stack|stack-sm|pattern-input-row)["']/;
const directCvaLayoutWrapperPattern =
  /cva\(\s*["'](?:action-buttons|action-item|button-row|action-row|row-between|pattern-input-row|card card-stack|output-panel|editor-panel)["']/;
const directPaneCardPattern = /className=["'][^"']*card card-stack/;
const directTypographyClassPattern =
  /className=["'][^"']*(?:action-title|editor-title|hint|empty-message|pane-title|pane-subtitle|meta-title)(?:\s|["'])/;
const directPanelSectionClassPattern =
  /<(?:div|section)\s+className=["'](?:output-panel|editor-panel)["']/;
const directBadgeClassPattern =
  /className=["'][^"']*(?:badge badge-info|chip chip-soft|action-kind-badge)(?:\s|["'])/;
const badgeOwnedFocusDiagnosticStatusClassPattern =
  /className=["'][^"']*focus-diagnostic-status(?:--(?:active|neutral|warning))?(?:\s|["'])/;
const directPatternListItemClassPattern =
  /className=["'][^"']*(?:pattern-list-inner|pattern-item|pattern-text)(?:\s|["'])/;
const directSortableListClassPattern =
  /className=["'][^"']*(?:sortable-list|sortable-item|sortable-item-content)(?:\s|["'])/;
const directSearchGroupMembershipClassPattern =
  /className=["'][^"']*(?:group-engines-list|group-engine-item|group-engine-name)(?:\s|["'])/;
const directSearchGroupInlineEditClassPattern =
  /className=["'][^"']*(?:inline-edit-row|inline-edit-input)(?:\s|["'])/;
const directOverlayPrimaryClassPattern =
  /className=["'][^"']*mbu-overlay-primary-(?:block|block--copy|markdown)(?:\s|["'])/;
const directListItemRowTextClassPattern =
  /className=["'][^"']*(?:search-engine-name|search-engine-url)(?:\s|["'])/;
const directAccordionPreviewClassPattern =
  /className=["'][^"']*mbu-accordion-(?:meta|note|text-wrapper|text)(?:\s|["'])/;
const sharedDialogPopupClassPattern =
  /(?:sidebar-brand|menu-scrim|menu-drawer|mbu-drawer-backdrop)/;
const directPatternAddFormClassPattern =
  /<Form[\s\S]*variant=["']patternGroup["'][\s\S]*<Input[\s\S]*variant=["']pattern["'][\s\S]*<Button[\s\S]*type=["']submit["']/;
const lucideImportPattern = /from\s+["']lucide-react["']/;
const nativeInputPattern = /<input\b/;
const nativePrePattern = /<pre\b/;
const nativeTextareaPattern = /<textarea\b/;
const nativeButtonPattern = /<button\b/;
const shadcnUiPathPattern =
  /(?:components\/ui|@\/components\/ui|src\/components\/ui)/;
const sourceFilePattern = /\.(?:ts|tsx)$/;

function toProjectPath(filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

function listSourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(entryPath));
      continue;
    }

    if (entry.isFile() && sourceFilePattern.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function findFilesMatching(pattern: RegExp): string[] {
  return listSourceFiles(sourceRoot)
    .filter(
      (filePath) =>
        !filePath.endsWith(".stories.tsx") &&
        pattern.test(fs.readFileSync(filePath, "utf8"))
    )
    .map(toProjectPath)
    .sort();
}

function findFilesWithBaseUiImports(): string[] {
  return findFilesMatching(baseUiImportPattern);
}

describe("shared UI primitive boundaries", () => {
  it("keeps Base UI imports inside shared wrappers and toast plumbing", () => {
    const offenders = findFilesWithBaseUiImports().filter(
      (filePath) => !allowedBaseUiImportFiles.has(filePath)
    );

    expect(offenders).toEqual([]);
  });

  it("keeps lucide-react imports centralized in the Icon component", () => {
    const offenders = findFilesMatching(lucideImportPattern).filter(
      (filePath) => !allowedLucideImportFiles.has(filePath)
    );

    expect(offenders).toEqual([]);
  });

  it("keeps native checkbox styling behind the shared Checkbox component", () => {
    const offenders = findFilesMatching(nativeInputPattern).filter(
      (filePath) => !allowedNativeInputFiles.has(filePath)
    );

    expect(offenders).toEqual([]);
  });

  it("keeps button styling behind the shared Button component", () => {
    const offenders = findFilesMatching(nativeButtonPattern);

    expect(offenders).toEqual([]);
  });

  it("keeps preformatted text output behind the shared TextOutput component", () => {
    const offenders = findFilesMatching(nativePrePattern).filter(
      (filePath) => !allowedNativePreFiles.has(filePath)
    );

    expect(offenders).toEqual([]);
  });

  it("keeps textarea styling behind the shared Textarea component", () => {
    const offenders = findFilesMatching(nativeTextareaPattern).filter(
      (filePath) => !allowedNativeTextareaFiles.has(filePath)
    );

    expect(offenders).toEqual([]);
  });

  it("keeps text surface classes behind shared text components", () => {
    const offenders = findFilesMatching(directTextSurfaceClassPattern);

    expect(offenders).toEqual([]);
  });

  it("keeps field layout classes behind shared field components", () => {
    const offenders = findFilesMatching(directFieldClassPattern).filter(
      (filePath) =>
        !(
          filePath === "src/components/shared/Field.tsx" ||
          filePath === "src/components/shared/SwitchField.tsx"
        )
    );

    expect(offenders).toEqual([]);
  });

  it("keeps standalone layout utility classes behind shared layout components", () => {
    const offenders = findFilesMatching(directLayoutWrapperPattern).filter(
      (filePath) => filePath !== "src/components/shared/Layout.tsx"
    );

    expect(offenders).toEqual([]);
  });

  it("keeps cva-composed layout utility classes behind shared layout components", () => {
    const offenders = findFilesMatching(directCvaLayoutWrapperPattern).filter(
      (filePath) => filePath !== "src/components/shared/Layout.tsx"
    );

    expect(offenders).toEqual([]);
  });

  it("keeps pane card layout behind the shared PaneCard component", () => {
    const offenders = findFilesMatching(directPaneCardPattern).filter(
      (filePath) => filePath !== "src/components/shared/Layout.tsx"
    );

    expect(offenders).toEqual([]);
  });

  it("keeps shared typography classes behind shared typography components", () => {
    const offenders = findFilesMatching(directTypographyClassPattern).filter(
      (filePath) => filePath !== "src/components/shared/Typography.tsx"
    );

    expect(offenders).toEqual([]);
  });

  it("keeps panel section classes behind shared panel components", () => {
    const offenders = findFilesMatching(directPanelSectionClassPattern).filter(
      (filePath) => filePath !== "src/components/shared/Layout.tsx"
    );

    expect(offenders).toEqual([]);
  });

  it("keeps badge classes behind the shared Badge component", () => {
    const offenders = [
      ...findFilesMatching(directBadgeClassPattern),
      ...findFilesMatching(badgeOwnedFocusDiagnosticStatusClassPattern),
    ]
      .filter((filePath) => filePath !== "src/components/shared/Badge.tsx")
      .sort();

    expect(offenders).toEqual([]);
  });

  it("keeps pattern list item classes behind the shared PatternListItem component", () => {
    const offenders = findFilesMatching(
      directPatternListItemClassPattern
    ).filter(
      (filePath) => filePath !== "src/components/shared/PatternListItem.tsx"
    );

    expect(offenders).toEqual([]);
  });

  it("keeps sortable list classes behind the SortableList component", () => {
    const offenders = findFilesMatching(directSortableListClassPattern).filter(
      (filePath) => filePath !== "src/components/SortableList.tsx"
    );

    expect(offenders).toEqual([]);
  });

  it("keeps search group membership classes inside SearchGroupItem", () => {
    const offenders = findFilesMatching(
      directSearchGroupMembershipClassPattern
    ).filter((filePath) => filePath !== "src/popup/panes/SearchGroupItem.tsx");

    expect(offenders).toEqual([]);
  });

  it("keeps search group inline edit classes inside SearchGroupItem", () => {
    const offenders = findFilesMatching(
      directSearchGroupInlineEditClassPattern
    ).filter((filePath) => filePath !== "src/popup/panes/SearchGroupItem.tsx");

    expect(offenders).toEqual([]);
  });

  it("keeps overlay primary classes behind overlayClassNames", () => {
    const offenders = findFilesMatching(directOverlayPrimaryClassPattern);

    expect(offenders).toEqual([]);
  });

  it("keeps list item row text classes behind the shared ListItemRow component", () => {
    const offenders = findFilesMatching(
      directListItemRowTextClassPattern
    ).filter(
      (filePath) => filePath !== "src/components/shared/ListItemRow.tsx"
    );

    expect(offenders).toEqual([]);
  });

  it("keeps accordion preview classes behind the shared Accordion component", () => {
    const offenders = findFilesMatching(
      directAccordionPreviewClassPattern
    ).filter((filePath) => filePath !== "src/components/shared/Accordion.tsx");

    expect(offenders).toEqual([]);
  });

  it("keeps popup drawer classes out of the shared Dialog component", () => {
    const dialogPath = path.join(sourceRoot, "components/shared/Dialog.tsx");

    expect(fs.readFileSync(dialogPath, "utf8")).not.toMatch(
      sharedDialogPopupClassPattern
    );
  });

  it("keeps simple pattern add forms behind the shared PatternAddForm component", () => {
    const offenders = findFilesMatching(
      directPatternAddFormClassPattern
    ).filter(
      (filePath) => filePath !== "src/components/shared/PatternAddForm.tsx"
    );

    expect(offenders).toEqual([]);
  });

  it("does not reintroduce the legacy UI primitive path", () => {
    const offenders = findFilesMatching(shadcnUiPathPattern);

    expect(offenders).toEqual([]);
  });
});
