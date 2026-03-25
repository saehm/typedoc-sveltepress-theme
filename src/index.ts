/**
 * The plugin entrypoint and bootstrapping of the plugin.
 *
 * @module core
 */
import * as fs from 'fs';
import * as path from 'path';
import { DeclarationOption, Options, OptionsReader } from 'typedoc';
import {
  MarkdownApplication,
  MarkdownPageEvent,
} from 'typedoc-plugin-markdown';
import { DEFAULT_SIDEBAR_OPTIONS } from './options.js';
import * as options from './options/declarations.js';
import { presets } from './options/presets.js';
import { getSidebar } from './sidebars/sidebars.js';
import {
  escapeSvelteInMarkdown,
  mapLinesOutsideFencedBlocks,
  slugifyAnchor,
} from './utils/utils.js';

export function load(app: MarkdownApplication) {
  Object.entries(options).forEach(([name, option]) => {
    app.options.addDeclaration({
      name,
      ...option,
    } as DeclarationOption);
  });

  app.options.addReader(
    new (class implements OptionsReader {
      name = 'sveltepress-options';
      readonly order = 0;
      readonly supportsPackages = false;
      read(container: Options) {
        Object.entries(presets).forEach(([key, value]) => {
          container.setValue(key, value);
        });
      }
    })(),
  );

  app.renderer.on(MarkdownPageEvent.BEGIN, (page) => {
    const isIndex = path.basename(page.filename) === 'index.md';
    if (isIndex) {
      // index.md → +page.md (same directory)
      page.filename = path.join(path.dirname(page.filename), '+page.md');
    } else if (page.filename.endsWith('.md')) {
      // foo.md → foo/+page.md (one level deeper)
      const dir = path.dirname(page.filename);
      const base = path.basename(page.filename, '.md');
      page.filename = path.join(dir, base, '+page.md');
    }

    // Set frontmatter title — required by SveltePress since hidePageHeader
    // suppresses the H1 heading that would otherwise serve as the page title
    page.frontmatter = {
      ...page.frontmatter,
      title: page.model.name,
    };
  });

  // Computed once on first page render
  let basePath: string | null = null;

  app.renderer.on(MarkdownPageEvent.END, (page) => {
    if (basePath === null) {
      const outDir = path.resolve(app.options.getValue('out'));
      const docsRoot = path.resolve(app.options.getValue('docsRoot'));
      const rel = path.relative(docsRoot, outDir).replace(/\\/g, '/');
      basePath = rel ? '/' + rel : '';
    }

    // Directory of the current page relative to the output root (using posix
    // separators since page.url always uses forward slashes)
    const pageDir = path.posix.dirname(page.url); // e.g. "interfaces" or "."

    // Transform relative .md links to absolute SvelteKit route paths so that
    // <Link to="..."> works unambiguously regardless of nesting depth.
    page.contents = page.contents?.replace(
      /\[([^\]]+)\]\((?!https?:|\/|#)([^)]*)\)/g,
      (match: string, text: string, url: string) => {
        const [filePart, ...anchorParts] = url.split('#');
        const anchor =
          anchorParts.length > 0
            ? '#' + slugifyAnchor(anchorParts.join('#'))
            : '';

        if (!filePart.endsWith('.md')) {
          return match;
        }

        // Resolve the relative path against the page's own directory so that
        // "../type-aliases/Foo.md" from "interfaces/Bar.md" becomes
        // "type-aliases/Foo.md" (output-root-relative).
        const prefix = pageDir !== '.' ? pageDir + '/' : '';
        const resolved = path.posix.normalize(prefix + filePart);

        let absolutePath: string;
        if (resolved.endsWith('index.md')) {
          // foo/index.md → /basePath/foo/
          absolutePath = (basePath + '/' + resolved.slice(0, -'index.md'.length)).replace(/\/+/g, '/');
        } else {
          // foo/bar.md → /basePath/foo/bar/
          absolutePath = (basePath + '/' + resolved.replace(/\.md$/, '/')).replace(/\/+/g, '/');
        }

        return `[${text}](${encodeURI(absolutePath + anchor)})`;
      },
    );

    // Remove empty <a id="..."></a> anchor tags injected by typedoc-plugin-markdown
    // into table cells. They interfere with mdsvex's HTML-in-markdown parser.
    if (page.contents) {
      page.contents = page.contents.replace(/<a id="[^"]*"><\/a>\s*/g, '');
    }

    // Convert markdown links [text](url) to SveltePress <Link> components.
    // mdsvex fails to render plain markdown link syntax inside GFM table cells,
    // causing "[text](url)" to appear as "text]" in the browser.
    // <Link> is a built-in SveltePress component available in all .md files.
    if (page.contents) {
      page.contents = mapLinesOutsideFencedBlocks(page.contents, (line) =>
        line.replace(
          /(`[^`]*`)|(\[([^\]]+)\]\(([^)]+)\))/g,
          (_match, code, _full, label, to) => {
            if (code) return code;
            return `<Link to="${to}" label="${label.replace(/"/g, '&quot;')}" />`;
          },
        ),
      );
    }

    // Escape { and } outside code blocks so mdsvex doesn't treat them as
    // Svelte expressions
    if (page.contents) {
      page.contents = escapeSvelteInMarkdown(page.contents);
    }

    // Prepend YAML frontmatter — typedoc-plugin-markdown does not serialize
    // page.frontmatter automatically; we must do it here
    if (page.frontmatter && Object.keys(page.frontmatter).length > 0) {
      const yaml = Object.entries(page.frontmatter)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n');
      page.contents = `---\n${yaml}\n---\n\n${page.contents ?? ''}`;
    }
  });

  app.renderer.postRenderAsyncJobs.push(async (output) => {
    const sidebarOptions = {
      ...DEFAULT_SIDEBAR_OPTIONS,
      ...app.options.getValue('sidebar'),
    };
    if (sidebarOptions.autoConfiguration && output.navigation) {
      const outDir = app.options.getValue('out');
      const sidebarPath = path.resolve(outDir, 'typedoc-sidebar.json');
      const basePath = path
        .relative(app.options.getValue('docsRoot'), outDir)
        .replace(/\\/g, '/');
      const sidebarJson = getSidebar(
        output.navigation,
        basePath,
        sidebarOptions,
      );
      fs.writeFileSync(
        sidebarPath,
        sidebarOptions.pretty
          ? JSON.stringify(sidebarJson, null, 2)
          : JSON.stringify(sidebarJson),
      );
    }
  });
}
