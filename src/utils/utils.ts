const rControl = /[\u0000-\u001f]/g;
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'""\u2018\u2019<>,.?/]+/g;
const rCombining = /[\u0300-\u036F]/g;

export const slugifyAnchor = (str: string): string =>
  str
    .normalize('NFKD')
    // Remove accents
    .replace(rCombining, '')
    // Remove control characters
    .replace(rControl, '')
    // Replace special characters
    .replace(rSpecial, '-')
    // Remove continuous separators
    .replace(/-{2,}/g, '-')
    // Remove prefixing and trailing separators
    .replace(/^-+|-+$/g, '')
    // ensure it doesn't start with a number (#121)
    .replace(/^(\d)/, '_$1')
    // lowercase
    .toLowerCase();

/**
 * Applies `fn` to each line of `content` that is outside a fenced code block.
 * Fence delimiters (``` lines) are passed through unchanged.
 */
export const mapLinesOutsideFencedBlocks = (
  content: string,
  fn: (line: string) => string,
): string => {
  let inFenced = false;
  return content
    .split('\n')
    .map((line) => {
      if (/^(\s*)```/.test(line)) {
        inFenced = !inFenced;
        return line;
      }
      return inFenced ? line : fn(line);
    })
    .join('\n');
};

/**
 * Escapes `{` and `}` characters in markdown prose (outside code blocks) so
 * that mdsvex (used by SveltePress) does not treat them as Svelte expressions.
 */
export const escapeSvelteInMarkdown = (content: string): string =>
  mapLinesOutsideFencedBlocks(content, (line) =>
    line.replace(/(`[^`]+`)|([{}])/g, (match, code) => {
      if (code) return code;
      return match === '{' ? '&#123;' : '&#125;';
    }),
  );
