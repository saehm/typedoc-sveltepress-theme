import { NavigationItem } from 'typedoc-plugin-markdown';
import { Sidebar } from '../types/index.js';
import sidebarSveltepress from './sidebar.sveltepress.js';

export function getSidebar(
  navigation: NavigationItem[],
  basePath: string,
  options: Sidebar,
) {
  return sidebarSveltepress(navigation, basePath, options);
}
