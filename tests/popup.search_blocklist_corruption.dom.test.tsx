import { Result } from "@praha/byethrow";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSearchBlocklistRules } from "@/popup/panes/search-blocklist/useSearchBlocklistRules";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";

vi.mock("@/search-blocklist/rules", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    compileSearchBlocklistPattern: () => Result.fail("compile failure"),
  };
});

function CorruptionProbe(props: PopupPaneBaseProps): React.JSX.Element {
  const { corrupted } = useSearchBlocklistRules(props);
  return <output>{corrupted ? "true" : "false"}</output>;
}

describe("popup search blocklist corruption detection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("marks a stored rule as corrupted when compilation fails", async () => {
    const props: PopupPaneBaseProps = {
      notify: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
      },
      runtime: createStoryPopupRuntime({
        local: {
          searchBlocklistRules: [
            { createdAt: 1, id: "rule-1", pattern: "example.com" },
          ],
        },
      }),
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<CorruptionProbe {...props} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toBe("true");
    root.unmount();
  });
});
