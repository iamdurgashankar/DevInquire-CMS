
export type BlockType = 'text' | 'image' | 'button' | 'video' | 'spacer' | 'html' | 'columns' | 'nav' | 'icon' | 'accordion' | 'pricing' | 'social' | 'code' | 'form';

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
  isCustomSite?: boolean;
  customSiteUrl?: string;
  customHTML?: string;
  customCSS?: string;
  customJS?: string;
}

export interface GlobalStyles {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
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
}

export interface User {
  name: string;
  email: string;
  role: string;
  avatar: string;
  avatarUrl?: string;
  bio: string;
  location: string;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}
