/** Encode path segments so spaces in filenames (e.g. "alex 1.png") load reliably. */
export function publicAssetUrl(path: string): string {
  if (!path || path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const hashIndex = path.indexOf("#");
  const queryIndex = path.indexOf("?");
  let end = path.length;
  if (hashIndex >= 0) end = Math.min(end, hashIndex);
  if (queryIndex >= 0) end = Math.min(end, queryIndex);
  const pathname = path.slice(0, end);
  const suffix = path.slice(end);
  const encoded = pathname
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join("/");
  return `${encoded}${suffix}`;
}
