import { CHATGPT_USAGE_URL } from "@/ai/chatgpt/oauth";
import { Button } from "@/components/shared/Button";
import { Fieldset } from "@/components/shared/Fieldset";
import { ButtonRow } from "@/components/shared/Layout";
import { Hint } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { SettingsPaneCard } from "@/popup/panes/settings/SettingsPaneLayout";
import {
  type UseChatGptAccount,
  useChatGptAccount,
} from "@/popup/panes/settings/useChatGptAccount";
import type { PopupPaneBaseProps } from "@/popup/panes/types";

function runSafely(action: () => Promise<void>): () => void {
  return () => {
    action().catch(() => {
      // no-op: failures are reported through notify
    });
  };
}

function StatusBody({
  account,
}: {
  account: UseChatGptAccount;
}): React.JSX.Element {
  const { auth } = account;
  if (auth === null) {
    return <Hint>{t("settings.chatgpt.loading")}</Hint>;
  }
  switch (auth.status) {
    case "signedOut":
      return <Hint>{t("settings.chatgpt.signedOutDescription")}</Hint>;
    case "pending":
      return (
        <p className="chatgpt-account-title">
          {t("settings.chatgpt.pendingTitle")}
        </p>
      );
    case "signedIn":
      return (
        <>
          <p className="chatgpt-account-title">
            {t("settings.chatgpt.signedInTitle")}
          </p>
          {auth.email ? <Hint>{auth.email}</Hint> : null}
          {auth.errorMessage ? (
            <Hint className="hint--danger">{auth.errorMessage}</Hint>
          ) : null}
          <Hint>{t("settings.chatgpt.signedInHint")}</Hint>
          <Hint>
            <a
              aria-label={t("settings.chatgpt.manageUsageLabel")}
              className="chatgpt-account-link"
              href={CHATGPT_USAGE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("settings.chatgpt.manageUsage")}
            </a>
          </Hint>
        </>
      );
    default:
      return (
        <>
          <p className="chatgpt-account-title">
            {t("settings.chatgpt.failedTitle")}
          </p>
          <Hint className="hint--danger">
            {auth.errorMessage ?? t("settings.chatgpt.errors.failedFallback")}
          </Hint>
        </>
      );
  }
}

function Actions({
  account,
}: {
  account: UseChatGptAccount;
}): React.JSX.Element | null {
  const { auth, opening, busy } = account;
  if (auth === null) {
    return null;
  }
  const handleSignIn = runSafely(account.signIn);

  if (auth.status === "signedIn") {
    return (
      <ButtonRow data-testid="chatgpt-actions">
        <Button
          data-testid="chatgpt-test"
          disabled={busy}
          onClick={runSafely(account.testConnection)}
          size="small"
          type="button"
          variant="ghost"
        >
          {t("settings.chatgpt.testConnection")}
        </Button>
        <Button
          data-testid="chatgpt-sign-out"
          disabled={busy}
          onClick={runSafely(account.signOut)}
          size="small"
          type="button"
          variant="danger"
        >
          {t("settings.chatgpt.signOut")}
        </Button>
      </ButtonRow>
    );
  }

  let label = t("settings.chatgpt.signIn");
  let variant: "primary" | "ghost" = "primary";
  if (auth.status === "pending") {
    label = t("settings.chatgpt.reopenSignIn");
    variant = "ghost";
  } else if (auth.status === "failed") {
    label = t("settings.chatgpt.retrySignIn");
  }

  return (
    <ButtonRow data-testid="chatgpt-actions">
      <Button
        data-testid="chatgpt-sign-in"
        disabled={opening}
        onClick={handleSignIn}
        size="small"
        type="button"
        variant={variant}
      >
        {opening ? t("settings.chatgpt.openingBrowser") : label}
      </Button>
    </ButtonRow>
  );
}

export function SettingsChatGptAccountSection(
  props: PopupPaneBaseProps
): React.JSX.Element {
  const account = useChatGptAccount(props);

  return (
    <SettingsPaneCard section="token">
      <Fieldset legend={t("settings.chatgpt.legend")} spacing="stack">
        <div
          aria-live="polite"
          className="chatgpt-account-status"
          data-testid="chatgpt-status"
        >
          <div
            className="chatgpt-account-state"
            data-status={account.auth?.status ?? "loading"}
            key={account.auth?.status ?? "loading"}
          >
            <StatusBody account={account} />
          </div>
        </div>
      </Fieldset>
      <Actions account={account} />
    </SettingsPaneCard>
  );
}
