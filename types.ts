
export type BlockType = 'text' | 'image' | 'button' | 'video' | 'spacer' | 'html' | 'columns' | 'nav' | 'icon' | 'accordion' | 'pricing' | 'social' | 'code' | 'form' | 'map' | 'testimonial' | 'gallery' | 'divider' | 'counter' | 'progress' | 'tabs' | 'list' | 'alert' | 'newsletter' | 'embed' | 'sitemap';

export interface BlockStyles {
  margin?: string;
  padding?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  color?: string;
  fontSize?: string;
  textAlign?: 'left' | 'center' | 'right';
  borderRadius?: string;
  borderWidth?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderColor?: string;
  display?: string;
  opacity?: string;
  zIndex?: string;
  width?: string;
  height?: string;
  boxShadow?: string;
  fontWeight?: string;
  customCSS?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  content: any;
  styles: BlockStyles;
  settings: Record<string, any>;
}

export interface Column {
  id: string;
  width: number; // Percentage or fraction
  blocks: Block[];
}

export interface Section {
  id: string;
  columns: Column[];
  styles: BlockStyles;
}

export interface LayoutJSON {
  sections: Section[];
  layoutVersion: string;
}

export interface PageSEO {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
}

export interface URLRewrite {
  id: string;
  source: string;
  target: string;
  type: '301' | '302' | '303' | '307' | '308' | 'rewrite' | 'proxy';
  isActive: boolean;
  createdAt: string;
}

export type PageVersionTrigger = 'manual' | 'save' | 'publish' | 'restore-backup';

export interface PageVersionSnapshot {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  seo: PageSEO;
  layoutJSON: LayoutJSON;
  isCustomSite?: boolean;
  customSiteUrl?: string;
  customHTML?: string;
  customCSS?: string;
  customJS?: string;
}

export interface PageVersion {
  id: string;
  pageId: string;
  versionNumber: number;
  label: string;
  notes?: string;
  trigger: PageVersionTrigger;
  createdAt: string;
  author: string;
  snapshot: PageVersionSnapshot;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  seo: PageSEO;
  layoutJSON: LayoutJSON;
  createdAt: string;
  updatedAt: string;
  author: string;
  updatedBy?: string;
  isCustomSite?: boolean;
  customSiteUrl?: string;
  customHTML?: string;
  customCSS?: string;
  customJS?: string;
  versions?: PageVersion[];
  domainId?: string;
  domain?: string;
}

export interface GlobalStyles {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundGradient?: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  containerWidth: string;
  borderRadius: string;
}

export interface Template {
  id: string;
  name: string;
  type: 'section' | 'page';
  layoutJSON: LayoutJSON | Section;
  createdBy: string;
  description?: string;
  category?: string;
  preview?: string;
  createdAt?: string;
  author?: string;
  isCustomSite?: boolean;
  customHTML?: string;
  customCSS?: string;
  customJS?: string;
}

export type AccessLevel = 'none' | 'view' | 'manage';

export type UserRolePreset =
  | 'Administrator'
  | 'Editor'
  | 'Media Manager'
  | 'Collection Architect'
  | 'SEO Specialist'
  | 'Viewer'
  | 'Custom';

export interface GranularMediaPermissions {
  level: AccessLevel;
  canUpload: boolean;
  canDelete: boolean;
}

export interface GranularCollectionPermissions {
  level: AccessLevel;
  canEditEntries: boolean;
  canEditSchema: boolean;
  canDelete: boolean;
}

export interface UserSectionPermissions {
  pages: AccessLevel;
  templates: AccessLevel;
  media: GranularMediaPermissions;
  collections: GranularCollectionPermissions;
  rewrites: AccessLevel;
  headlessApi: AccessLevel;
  settings: AccessLevel;
  seo: AccessLevel;
  users: AccessLevel;
}

export const ROLE_PERMISSION_PRESETS: Record<Exclude<UserRolePreset, 'Custom'>, UserSectionPermissions> = {
  Administrator: {
    pages: 'manage',
    templates: 'manage',
    media: { level: 'manage', canUpload: true, canDelete: true },
    collections: { level: 'manage', canEditEntries: true, canEditSchema: true, canDelete: true },
    rewrites: 'manage',
    headlessApi: 'manage',
    settings: 'manage',
    seo: 'manage',
    users: 'manage',
  },
  Editor: {
    pages: 'manage',
    templates: 'manage',
    media: { level: 'manage', canUpload: true, canDelete: false },
    collections: { level: 'manage', canEditEntries: true, canEditSchema: false, canDelete: false },
    rewrites: 'view',
    headlessApi: 'view',
    settings: 'view',
    seo: 'view',
    users: 'none',
  },
  'Media Manager': {
    pages: 'view',
    templates: 'view',
    media: { level: 'manage', canUpload: true, canDelete: true },
    collections: { level: 'view', canEditEntries: false, canEditSchema: false, canDelete: false },
    rewrites: 'none',
    headlessApi: 'view',
    settings: 'none',
    seo: 'none',
    users: 'none',
  },
  'Collection Architect': {
    pages: 'view',
    templates: 'view',
    media: { level: 'manage', canUpload: true, canDelete: false },
    collections: { level: 'manage', canEditEntries: true, canEditSchema: true, canDelete: true },
    rewrites: 'view',
    headlessApi: 'manage',
    settings: 'none',
    seo: 'view',
    users: 'none',
  },
  'SEO Specialist': {
    pages: 'view',
    templates: 'none',
    media: { level: 'view', canUpload: false, canDelete: false },
    collections: { level: 'view', canEditEntries: false, canEditSchema: false, canDelete: false },
    rewrites: 'manage',
    headlessApi: 'view',
    settings: 'view',
    seo: 'manage',
    users: 'none',
  },
  Viewer: {
    pages: 'view',
    templates: 'view',
    media: { level: 'view', canUpload: false, canDelete: false },
    collections: { level: 'view', canEditEntries: false, canEditSchema: false, canDelete: false },
    rewrites: 'none',
    headlessApi: 'view',
    settings: 'none',
    seo: 'view',
    users: 'none',
  },
};

export const getPermissionsForRole = (
  role: string,
  existing?: Partial<UserSectionPermissions>
): UserSectionPermissions => {
  const normalizedRole =
    role in ROLE_PERMISSION_PRESETS
      ? (role as Exclude<UserRolePreset, 'Custom'>)
      : role.toLowerCase() === 'admin'
      ? 'Administrator'
      : role.toLowerCase() === 'editor'
      ? 'Editor'
      : role.toLowerCase() === 'viewer'
      ? 'Viewer'
      : 'Editor';

  const base = ROLE_PERMISSION_PRESETS[normalizedRole];
  if (!existing) {
    return {
      ...base,
      media: { ...base.media },
      collections: { ...base.collections },
    };
  }
  return {
    pages: existing.pages ?? base.pages,
    templates: existing.templates ?? base.templates,
    media: {
      level: existing.media?.level ?? base.media.level,
      canUpload: existing.media?.canUpload ?? base.media.canUpload,
      canDelete: existing.media?.canDelete ?? base.media.canDelete,
    },
    collections: {
      level: existing.collections?.level ?? base.collections.level,
      canEditEntries: existing.collections?.canEditEntries ?? base.collections.canEditEntries,
      canEditSchema: existing.collections?.canEditSchema ?? base.collections.canEditSchema,
      canDelete: existing.collections?.canDelete ?? base.collections.canDelete,
    },
    rewrites: existing.rewrites ?? base.rewrites,
    headlessApi: existing.headlessApi ?? base.headlessApi,
    settings: existing.settings ?? base.settings,
    seo: existing.seo ?? base.seo,
    users: existing.users ?? base.users,
  };
};

export interface User {
  name: string;
  email: string;
  role: string;
  avatar: string;
  avatarUrl?: string;
  bio: string;
  location: string;
  plan?: 'Free' | 'Starter' | 'Professional' | 'Enterprise' | 'Unlimited';
  usage?: {
    percentage: number;
    label: string;
  };
  permissions?: UserSectionPermissions;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number | string;
  createdAt?: string;
  date?: string;
  category?: 'image' | 'illustration' | 'icon' | 'document' | 'banner';
  dimensions?: string;
  uploadedBy?: string;
}

export interface UserManagementItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Pending';
  lastActive: string;
  permissions?: UserSectionPermissions;
}

export interface DomainConnection {
  id: string;
  domain: string;
  hostingProvider: string;
  siteName?: string;
  baseUrl: string;
  connected: boolean;
  dnsVerified?: boolean;
  resolvedIps?: string[];
  verifiedAt?: string;
}

export interface SiteConfig {
  siteName: string;
  baseUrl: string;
  customDomain?: string;
  hostingProvider?: string;
  hostingConnected?: boolean;
  verifiedAt?: string;
  resolvedIps?: string[];
  domains?: DomainConnection[];
  activeDomainId?: string;
}

export type CollectionFieldType = 'text' | 'rich-text' | 'image' | 'date' | 'number' | 'boolean' | 'select' | 'relation';

export interface CollectionField {
  id: string;
  name: string;
  slug: string;
  type: CollectionFieldType;
  required: boolean;
  options?: string[]; // For select type
  relationTo?: string; // For relation type (collection id)
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  fields: CollectionField[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CollectionEntry {
  id: string;
  collectionId: string;
  data: Record<string, any>;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  author: string;
  updatedBy?: string;
}

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'published'
  | 'deleted'
  | 'uploaded'
  | 'duplicated'
  | 'restored'
  | 'connected'
  | 'synced';

export type ActivityCategory =
  | 'page'
  | 'template'
  | 'media'
  | 'collection'
  | 'entry'
  | 'rewrite'
  | 'user'
  | 'settings'
  | 'styles';

export interface ActivityLogItem {
  id: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  action: ActivityAction;
  category: ActivityCategory;
  targetId?: string;
  targetName: string;
  details?: string;
  timestamp: string;
}
