import { Result } from "@praha/byethrow";
import { useCallback, useEffect, useState } from "react";
import { t } from "@/i18n";
import {
  isChatGptAuthStateResponse,
  isChatGptSignInResponse,
  isChatGptSignOutResponse,
} from "@/popup/panes/settings/chatgptResponses";
import { isTestAiTokenResponse } from "@/popup/panes/settings/isTestAiTokenResponse";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type {
  ChatGptAuthState,
  ChatGptAuthStateRequest,
  ChatGptSignInRequest,
  ChatGptSignOutRequest,
  TestAiTokenRequest,
} from "@/popup/runtime";

const LOCAL_CREDENTIALS_KEY = "chatgptCredentials";
const SESSION_SIGN_IN_KEY = "chatgptSignIn";

export type UseChatGptAccount = {
  auth: ChatGptAuthState | null;
  opening: boolean;
  busy: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  testConnection: () => Promise<void>;
};

export function useChatGptAccount(
  params: PopupPaneBaseProps
): UseChatGptAccount {
  const { runtime, notify } = params;
  const [auth, setAuth] = useState<ChatGptAuthState | null>(null);
  const [opening, setOpening] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const response = await runtime.sendMessageToBackground<
      ChatGptAuthStateRequest,
      unknown
    >({ action: "chatgptAuthState" });
    let failure: string | null = null;
    if (Result.isFailure(response)) {
      failure = response.error;
    } else if (isChatGptAuthStateResponse(response.value)) {
      const state = response.value;
      if (Result.isSuccess(state)) {
        setAuth(state.value);
        return;
      }
      failure = state.error;
    } else {
      failure = t("settings.errors.invalidBackgroundResponse");
    }
    const errorMessage = failure;
    setAuth(
      (previous) => previous ?? { email: null, errorMessage, status: "failed" }
    );
  }, [runtime]);

  useEffect(() => {
    refresh().catch(() => {
      // no-op: the card falls back to the failed state
    });

    const onChanged =
      typeof chrome === "undefined" ? undefined : chrome.storage?.onChanged;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ): void => {
      const relevant =
        (areaName === "local" && LOCAL_CREDENTIALS_KEY in changes) ||
        (areaName === "session" && SESSION_SIGN_IN_KEY in changes);
      if (!relevant) {
        return;
      }
      refresh().catch(() => {
        // no-op: keep the previous state
      });
    };
    onChanged?.addListener(handleStorageChange);

    return () => {
      onChanged?.removeListener(handleStorageChange);
    };
  }, [refresh]);

  const signIn = async (): Promise<void> => {
    setOpening(true);
    const response = await runtime.sendMessageToBackground<
      ChatGptSignInRequest,
      unknown
    >({ action: "chatgptSignIn" });

    let failure: string | null = null;
    if (Result.isFailure(response)) {
      failure = response.error;
    } else if (!isChatGptSignInResponse(response.value)) {
      failure = t("settings.errors.invalidBackgroundResponse");
    } else if (Result.isFailure(response.value)) {
      failure = response.value.error;
    }

    if (failure !== null) {
      setOpening(false);
      notify.error(failure);
      return;
    }
    await refresh();
    setOpening(false);
  };

  const signOut = async (): Promise<void> => {
    setBusy(true);
    try {
      const response = await runtime.sendMessageToBackground<
        ChatGptSignOutRequest,
        unknown
      >({ action: "chatgptSignOut" });
      if (Result.isFailure(response)) {
        notify.error(response.error);
        return;
      }
      if (!isChatGptSignOutResponse(response.value)) {
        notify.error(t("settings.errors.invalidBackgroundResponse"));
        return;
      }
      if (Result.isFailure(response.value)) {
        notify.error(response.value.error);
        return;
      }
      notify.success(
        response.value.value.revokeConfirmed
          ? t("settings.chatgpt.signOutSuccess")
          : t("settings.chatgpt.signOutRevokeUnconfirmed")
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const testConnection = async (): Promise<void> => {
    setBusy(true);
    try {
      const response = await runtime.sendMessageToBackground<
        TestAiTokenRequest,
        unknown
      >({ action: "testAiToken" });
      if (Result.isFailure(response)) {
        notify.error(response.error);
        return;
      }
      if (!isTestAiTokenResponse(response.value)) {
        notify.error(t("settings.errors.invalidBackgroundResponse"));
        return;
      }
      if (Result.isFailure(response.value)) {
        notify.error(response.value.error);
        return;
      }
      notify.success(t("settings.success.tokenOk"));
    } finally {
      setBusy(false);
    }
  };

  return { auth, busy, opening, signIn, signOut, testConnection };
}
