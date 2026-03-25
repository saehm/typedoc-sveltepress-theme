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
 * Escapes characters that mdsvex/Svelte would misinterpret as syntax:
 * - `{` / `}` → HTML entities (Svelte expression delimiters)
 * - `\<` / `\>` → `&lt;` / `&gt;` (markdown-escaped angle brackets, e.g.
 *   from TypeScript generics like `Array\<string\>`; Svelte still tries to
 *   parse the resulting `<` as a component/element tag)
 * Leaves inline code spans and fenced code blocks untouched.
 */
export const escapeSvelteInMarkdown = (content: string): string =>
  mapLinesOutsideFencedBlocks(content, (line) =>
    // Groups (in order):
    //   1. backtick code spans  `` `...` ``          — leave as-is
    //   2. <code>...</code> HTML spans               — leave as-is (already use
    //                                                  {'{'}…{'}'} for braces)
    //   3. { or }                                    — escape to HTML entities
    //   4. \< or \>  (markdown-escaped angle brackets) — convert to &lt;/&gt;
    line.replace(
      /(`[^`]*`)|(<code>[^<]*<\/code>)|([{}])|(\\\<)|(\\\>)/g,
      (match, backtick, codeTag) => {
        if (backtick || codeTag) return match;
        if (match === '{') return '&#123;';
        if (match === '}') return '&#125;';
        if (match === '\\<') return '&lt;';
        if (match === '\\>') return '&gt;';
        return match;
      },
    ),
  );
