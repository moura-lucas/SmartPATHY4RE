// Control characters are invalid in XML, and Office refuses to open a file that has them (AC16.5).
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export function cleanText(value: string): string {
  return value.replace(INVALID_XML_CHARS, "");
}
