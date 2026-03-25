import * as path from 'path';
import { NavigationItem } from 'typedoc-plugin-markdown';
import { Sidebar } from '../types/index.js';

export default (
  navigation: NavigationItem[],
  basePath: string,
  options: Sidebar,
) => {
  return navigation.map((navigationItem) => {
    return getNavigationItem(navigationItem, basePath, options);
  });
};

function getNavigationItem(
  navigationItem: NavigationItem,
  basePath: string,
  options: Sidebar,
) {
  const hasChildren = navigationItem?.children?.length;

  const linkParts: string[] = [];

  if (navigationItem?.path) {
    if (basePath.length) {
      linkParts.push(basePath);
    }
    linkParts.push(
      getParsedUrl(navigationItem.path as string).replace(/\\/g, '/'),
    );
  }

  return {
    title: navigationItem.title,
    ...(linkParts.length && {
      to: `/${linkParts.join('/')}`,
    }),
    ...(hasChildren && { collapsible: options.collapsible }),
    ...(hasChildren && {
      items: navigationItem.children?.map((group) =>
        getNavigationItem(group, basePath, options),
      ),
    }),
  };
}

function getParsedUrl(url: string) {
  if (path.basename(url) === 'index.md') {
    const dir = path.dirname(url);
    return (dir === '.' ? '' : dir + '/') + 'overview';
  }
  return url.replace(/\.md$/, '');
}
