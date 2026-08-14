import type { Preview } from "@storybook/react-vite";
import { ensurePopupUiBaseStyles } from "@/ui/styles";
import { applyTheme, isTheme } from "@/ui/theme";

const preview: Preview = {
  decorators: [
    (Story, context) => {
      ensurePopupUiBaseStyles(document);
      document.body.classList.add("is-extension");
      const { theme } = context.globals;
      const { layout } = context.parameters;
      const isFullscreen = layout === "fullscreen";
      applyTheme(isTheme(theme) ? theme : "auto", document);
      return (
        <div
          className="mbu-surface"
          style={{ minHeight: "100vh", padding: isFullscreen ? 0 : 16 }}
        >
          <Story />
        </div>
      );
    },
  ],
  globalTypes: {
    theme: {
      defaultValue: "auto",
      description: "UI theme",
      toolbar: {
        dynamicTitle: true,
        icon: "circlehollow",
        items: [
          { title: "Auto", value: "auto" },
          { title: "Dark", value: "dark" },
          { title: "Light", value: "light" },
        ],
      },
    },
  },
  parameters: {
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
