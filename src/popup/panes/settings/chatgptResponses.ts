import type {
  ChatGptAuthState,
  ChatGptAuthStateResponse,
  ChatGptSignInResponse,
  ChatGptSignOutResponse,
} from "@/popup/runtime";
import { isRecord } from "@/utils/guards";

function isFailureResult(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.type === "Failure" &&
    typeof value.error === "string"
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isChatGptAuthState(value: unknown): value is ChatGptAuthState {
  return (
    isRecord(value) &&
    (value.status === "signedOut" ||
      value.status === "pending" ||
      value.status === "signedIn" ||
      value.status === "failed") &&
    isNullableString(value.email) &&
    isNullableString(value.errorMessage)
  );
}

export function isChatGptAuthStateResponse(
  value: unknown
): value is ChatGptAuthStateResponse {
  if (isFailureResult(value)) {
    return true;
  }
  return (
    isRecord(value) &&
    value.type === "Success" &&
    isChatGptAuthState(value.value)
  );
}

export function isChatGptSignInResponse(
  value: unknown
): value is ChatGptSignInResponse {
  if (isFailureResult(value)) {
    return true;
  }
  return isRecord(value) && value.type === "Success" && isRecord(value.value);
}

export function isChatGptSignOutResponse(
  value: unknown
): value is ChatGptSignOutResponse {
  if (isFailureResult(value)) {
    return true;
  }
  return (
    isRecord(value) &&
    value.type === "Success" &&
    isRecord(value.value) &&
    typeof value.value.revokeConfirmed === "boolean"
  );
}
