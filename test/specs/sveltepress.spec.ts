import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function assertToMatchSnapshot(name: string, content: string) {
  const snapshotDir = path.join(__dirname, '../__snapshots__');
  const snapshotPath = path.join(snapshotDir, `${name}.snap`);

  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  if (!fs.existsSync(snapshotPath)) {
    fs.writeFileSync(snapshotPath, content);
  } else {
    const existingContent = fs.readFileSync(snapshotPath, 'utf8');
    expect(content).to.equal(existingContent);
  }
}

describe(`typedoc-sveltepress-theme`, () => {
  it(`should output docs with sveltepress theme`, async () => {
    const contents = fs
      .readFileSync(path.join(__dirname, '../out/default/index.md'), 'utf8')
      .toString();
    assertToMatchSnapshot('index-page', contents);
  });

  it(`should output members that require anchor slugification`, async () => {
    const contents = fs
      .readFileSync(
        path.join(
          __dirname,
          '../out/default/module-1/interfaces/InterfaceA.md',
        ),
        'utf8',
      )
      .toString();
    assertToMatchSnapshot('reflection-page', contents);
  });

  it(`should generate typedoc sidebar`, async () => {
    const contents = fs
      .readFileSync(path.join(__dirname, '../out/default/typedoc-sidebar.json'), 'utf8')
      .toString();
    assertToMatchSnapshot('default-sidebar', contents);
  });

  it(`should generate typedoc sidebar with options`, async () => {
    const contents = fs
      .readFileSync(
        path.join(__dirname, '../out/sidebar-options/typedoc-sidebar.json'),
        'utf8',
      )
      .toString();
    assertToMatchSnapshot('sidebar-with-options', contents);
  });

  it(`should generate typedoc sidebar with duplicate out and docsRoots`, async () => {
    const contents = fs
      .readFileSync(
        path.join(__dirname, '../out/sidebar-options-2/typedoc-sidebar.json'),
        'utf8',
      )
      .toString();
    assertToMatchSnapshot('docs-root', contents);
  });
});
