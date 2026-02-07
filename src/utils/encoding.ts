import Encoding from "encoding-japanese";

function isValidByte(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 0xff;
}

function normalizeShiftJisBytes(value: unknown): number[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(isValidByte);
  }
  if (ArrayBuffer.isView(value)) {
    return Array.from(value as ArrayLike<number>).filter(isValidByte);
  }
  if (typeof value === "object" && "length" in value) {
    return Array.from(value as ArrayLike<number>).filter(isValidByte);
  }
  return [];
}

export function encodeShiftJisQuery(query: string): string {
  const converted = Encoding.convert(Encoding.stringToCode(query), {
    to: "SJIS",
    from: "UNICODE",
  });
  const sjisBytes = normalizeShiftJisBytes(converted);
  if (sjisBytes.length === 0) {
    return encodeURIComponent(query);
  }
  return sjisBytes
    .map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`)
    .join("");
}
