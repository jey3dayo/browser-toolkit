import { Result } from "@praha/byethrow";
import { patternToRegex } from "@/utils/url-pattern";

export type DomainPatternConfig = {
  pattern: string;
  enableRowFilter: boolean;
};

export type DomainPatternConfigStorageData = {
  domainPatternConfigs?: unknown;
  domainPatterns?: unknown;
};

const HTTP_PROTOCOL_REGEX = /^https?:\/\//;

function validateDomainPatternConfigs(
  items: unknown
): Result.Result<DomainPatternConfig[], string> {
  if (!Array.isArray(items)) {
    return Result.fail("domainPatternConfigs must be an array");
  }

  const configs: DomainPatternConfig[] = [];
  for (const item of items) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.pattern !== "string" ||
      typeof item.enableRowFilter !== "boolean"
    ) {
      return Result.fail("Invalid domainPatternConfig item format");
    }
    const pattern = item.pattern.trim();
    if (pattern) {
      configs.push({ pattern, enableRowFilter: item.enableRowFilter });
    }
  }
  return Result.succeed(configs);
}

function validateLegacyDomainPatterns(
  items: unknown
): Result.Result<DomainPatternConfig[], string> {
  if (!Array.isArray(items)) {
    return Result.fail("domainPatterns must be an array");
  }

  const configs: DomainPatternConfig[] = [];
  for (const patternRaw of items) {
    if (typeof patternRaw !== "string") {
      return Result.fail("Invalid domainPatterns item format");
    }
    const pattern = patternRaw.trim();
    if (pattern) {
      configs.push({ pattern, enableRowFilter: false });
    }
  }
  return Result.succeed(configs);
}

export function normalizeDomainPatternConfigs(
  data: DomainPatternConfigStorageData
): Result.Result<DomainPatternConfig[], string> {
  if (data.domainPatternConfigs !== undefined) {
    return validateDomainPatternConfigs(data.domainPatternConfigs);
  }

  if (data.domainPatterns !== undefined) {
    return validateLegacyDomainPatterns(data.domainPatterns);
  }

  return Result.succeed([]);
}

export function getCurrentPatternRowFilterSetting(
  domainPatternConfigs: DomainPatternConfig[],
  currentUrl: string
): Result.Result<boolean, string> {
  const urlWithoutProtocol = currentUrl.replace(HTTP_PROTOCOL_REGEX, "");

  for (const config of domainPatternConfigs) {
    const patternWithoutProtocol = config.pattern.replace(
      HTTP_PROTOCOL_REGEX,
      ""
    );
    const regex = patternToRegex(patternWithoutProtocol);
    if (regex.test(urlWithoutProtocol)) {
      return Result.succeed(config.enableRowFilter);
    }
  }

  return Result.succeed(false);
}
