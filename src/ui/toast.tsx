import { Toast } from "@base-ui/react/toast";
import { cloneElement, useMemo } from "react";

export type NotifyOptions = {
  title: string;
  description?: React.ReactNode;
};

export type Notifier = {
  info: (message: string) => void;
  success: (message: string) => void;
  error: (message: string | NotifyOptions) => void;
};

export type ToastManager = ReturnType<typeof Toast.createToastManager>;
export type ToastPortalContainer = React.ComponentProps<
  typeof Toast.Portal
>["container"];

export function createNotifications(): {
  toastManager: ToastManager;
  notify: Notifier;
} {
  const toastManager = Toast.createToastManager();

  const notify: Notifier = {
    error: (messageOrOptions) => {
      const options =
        typeof messageOrOptions === "string"
          ? { title: messageOrOptions }
          : messageOrOptions;

      toastManager.add({
        description: options.description,
        priority: "high",
        timeout: 3500,
        title: options.title,
        type: "error",
      });
    },
    info: (message) => {
      toastManager.add({
        priority: "low",
        timeout: 2500,
        title: message,
        type: "info",
      });
    },
    success: (message) => {
      toastManager.add({
        priority: "low",
        timeout: 2200,
        title: message,
        type: "success",
      });
    },
  };

  return { notify, toastManager };
}

export type ToastHostProps = {
  toastManager: ToastManager;
  portalContainer?: ToastPortalContainer;
  placement?: "screen" | "surface";
};

export function ToastHost(props: ToastHostProps): React.JSX.Element {
  const placement = props.placement ?? "screen";
  const viewportStyle: React.CSSProperties = {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    inset:
      placement === "surface"
        ? "var(--toast-surface-inset, 12px 12px auto auto)"
        : "var(--toast-screen-inset, 12px 12px auto auto)",
    pointerEvents: "none",
    position: placement === "surface" ? "absolute" : "fixed",
    zIndex: 2_147_483_647,
  };
  return (
    <Toast.Provider toastManager={props.toastManager}>
      <Toast.Portal container={props.portalContainer}>
        <Toast.Viewport
          className="mbu-toast-viewport"
          data-placement={placement}
          style={viewportStyle}
        >
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList(): React.JSX.Element {
  const { toasts } = Toast.useToastManager();

  const rendered = useMemo(
    () =>
      toasts.map((toast) => {
        const hasDescription =
          typeof toast.description === "string"
            ? toast.description.trim().length > 0
            : Boolean(toast.description);
        const content = (
          <Toast.Root
            className="mbu-toast-root"
            data-has-description={hasDescription ? "true" : "false"}
            style={{ pointerEvents: "auto" }}
            toast={toast}
          >
            <Toast.Content className="mbu-toast-content">
              <span aria-hidden="true" className="mbu-toast-indicator" />
              <div className="mbu-toast-text">
                {toast.title ? (
                  <Toast.Title className="mbu-toast-title">
                    {toast.title}
                  </Toast.Title>
                ) : null}
                {toast.description ? (
                  <Toast.Description className="mbu-toast-description">
                    {toast.description}
                  </Toast.Description>
                ) : null}
              </div>
              <Toast.Close aria-label="閉じる" className="mbu-toast-close">
                ×
              </Toast.Close>
            </Toast.Content>
          </Toast.Root>
        );

        if (toast.positionerProps?.anchor) {
          return (
            <Toast.Positioner
              key={toast.id}
              {...toast.positionerProps}
              className="mbu-toast-positioner"
              toast={toast}
            >
              {content}
            </Toast.Positioner>
          );
        }

        return cloneElement(content, { key: toast.id });
      }),
    [toasts]
  );

  return <>{rendered}</>;
}
