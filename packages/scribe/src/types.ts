// Guide status
export type GuideStatus = 'draft' | 'published' | 'archived';

// Guide visibility
export type GuideVisibility = 'private' | 'team' | 'public';

// Annotation type
export type AnnotationType =
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'text'
  | 'blur'
  | 'highlight'
  | 'click_indicator';

// Page item type
export type PageItemType =
  | 'guide_embed'
  | 'text_block'
  | 'video_link'
  | 'image'
  | 'divider';

// Share permission
export type SharePermission = 'view' | 'edit' | 'comment';

// Annotation
export interface Annotation {
  id: string;
  stepId: string;
  annotationType: AnnotationType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  color: string;
  strokeWidth: number;
  textContent?: string;
  fontSize: number;
  opacity: number;
  props: Record<string, unknown>;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Guide Step
export interface GuideStep {
  id: string;
  guideId: string;
  stepOrder: number;
  title?: string;
  instruction?: string;
  clickTarget?: string;
  url?: string;
  screenshotUrl?: string;
  screenshotStoragePath?: string;
  annotations: Annotation[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Guide
export interface Guide {
  id: string;
  accountId: string;
  createdBy?: string;
  title: string;
  description?: string;
  status: GuideStatus;
  visibility: GuideVisibility;
  coverImageUrl?: string;
  tags: string[];
  stepCount: number;
  viewCount: number;
  isTemplate: boolean;
  sourceUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  steps?: GuideStep[];
}

// Guide Page
export interface GuidePage {
  id: string;
  accountId: string;
  createdBy?: string;
  title: string;
  description?: string;
  slug?: string;
  isPublished: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  items?: GuidePageItem[];
}

// Guide Page Item
export interface GuidePageItem {
  id: string;
  pageId: string;
  itemType: PageItemType;
  itemOrder: number;
  guideId?: string;
  content?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Guide Share
export interface GuideShare {
  id: string;
  guideId: string;
  token: string;
  permission: SharePermission;
  hasPassword: boolean;
  expiresAt?: Date;
  maxViews?: number;
  currentViews: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Guide Template
export interface GuideTemplate {
  id: string;
  accountId?: string;
  guideId: string;
  name: string;
  description?: string;
  category?: string;
  isPublic: boolean;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Input types
export interface CreateGuideInput {
  accountId: string;
  title?: string;
  description?: string;
  visibility?: GuideVisibility;
  tags?: string[];
  sourceUrl?: string;
}

export interface UpdateGuideInput {
  id: string;
  title?: string;
  description?: string;
  status?: GuideStatus;
  visibility?: GuideVisibility;
  coverImageUrl?: string;
  tags?: string[];
  sourceUrl?: string;
}

export interface CreateStepInput {
  guideId: string;
  stepOrder: number;
  title?: string;
  instruction?: string;
  clickTarget?: string;
  url?: string;
}

export interface UpdateStepInput {
  id: string;
  title?: string;
  instruction?: string;
  clickTarget?: string;
  url?: string;
  screenshotUrl?: string;
  screenshotStoragePath?: string;
  annotations?: AnnotationInput[];
}

export interface AnnotationInput {
  annotationType: AnnotationType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;
  strokeWidth?: number;
  textContent?: string;
  fontSize?: number;
  opacity?: number;
  props?: Record<string, unknown>;
  sortOrder?: number;
}

export interface ReorderStepsInput {
  guideId: string;
  stepIds: string[];
}

export interface CreateShareInput {
  guideId: string;
  permission?: SharePermission;
  password?: string;
  expiresAt?: Date;
  maxViews?: number;
}

export interface GuideFilterOptions {
  status?: GuideStatus | GuideStatus[];
  visibility?: GuideVisibility;
  search?: string;
  tags?: string[];
  isTemplate?: boolean;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
