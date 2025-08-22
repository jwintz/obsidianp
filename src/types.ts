export interface FrontMatter {
  [key: string]: any;
  categories?: string[];
  tags?: string[];
  created?: string;
  url?: string;
  author?: string[];
  published?: string;
  topics?: string[];
  status?: string[];
}

export interface Note {
  id: string;
  title: string;
  path: string;
  relativePath: string;
  folderPath: string;
  content: string;
  frontMatter: FrontMatter;
  frontMatterHtml: string;
  html: string;
  links: string[];
  backlinks: string[];
}

export interface FolderNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children: FolderNode[];
  noteId?: string;
}

export interface VaultStructure {
  notes: Map<string, Note>;
  linkGraph: Map<string, Set<string>>;
  categories: Map<string, string[]>;
  tags: Map<string, string[]>;
  folderStructure: FolderNode[];
}

export interface SiteConfig {
  title: string;
  fonts?: {
    main?: string;
    heading?: string;
    code?: string;
  };
  customization?: {
    common?: Record<string, string>;
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
  // Legacy support - will be deprecated
  cssVariables?: Record<string, string>;
  theme?: 'light' | 'dark' | 'auto';
}
