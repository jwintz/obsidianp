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
  // File statistics
  fileStats?: {
    size: number;
    mtime: Date;
    ctime: Date;
  };
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
  bases: Map<string, Base>;
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

// Base (database) related types
export interface BaseFilter {
  and?: (BaseFilter | string)[];
  or?: (BaseFilter | string)[];
  not?: BaseFilter | string;
  // File properties
  'file.name'?: string | BaseStringFilter;
  'file.path'?: string | BaseStringFilter;
  'file.size'?: number | BaseNumberFilter;
  'file.mtime'?: string | Date | BaseDateFilter;
  'file.ctime'?: string | Date | BaseDateFilter;
  'file.tag'?: string | string[];
  'file.tags'?: string | string[];
  'file.hasTag'?: string | string[];
  'file.inFolder'?: string;
  'file.starred'?: boolean;
  // Custom properties (dynamic)
  [key: string]: any;
}

export interface BaseStringFilter {
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  matches?: string; // regex
  '='?: string;
  '!='?: string;
}

export interface BaseNumberFilter {
  '='?: number;
  '!='?: number;
  '>'?: number;
  '>='?: number;
  '<'?: number;
  '<='?: number;
}

export interface BaseDateFilter {
  before?: string | Date;
  after?: string | Date;
  on?: string | Date;
  '='?: string | Date;
  '!='?: string | Date;
  '>'?: string | Date;
  '>='?: string | Date;
  '<'?: string | Date;
  '<='?: string | Date;
}

export interface BaseView {
  type: 'table' | 'cards' | 'calendar';
  name: string;
  order?: string[];
  sort?: Array<{
    property: string;
    direction: 'ASC' | 'DESC';
  }>;
  columnSize?: Record<string, number>;
  limit?: number;
  filter?: BaseFilter; // View-specific filters
  group?: string; // Group by property
}

export interface BaseProperty {
  name: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'checkbox' | 'select' | 'multiselect' | 'url' | 'email' | 'file' | 'person';
  options?: string[];
  default?: any;
  required?: boolean;
  format?: string; // For dates, numbers, etc.
}

export interface BaseFormula {
  name: string;
  formula: string;
  type?: 'text' | 'number' | 'date' | 'boolean';
  format?: string;
}

export interface Base {
  id: string;
  title: string;
  source: string;
  path: string;
  relativePath: string;
  folderPath: string;
  description?: string;
  views: BaseView[];
  filters?: BaseFilter[];
  properties?: BaseProperty[];
  formulas?: BaseFormula[];
  matchedNotes?: Note[];
  items?: any[];
}
