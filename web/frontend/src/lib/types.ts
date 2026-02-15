/** Shared TypeScript types mirroring the backend schemas. */

export interface GenerateRequest {
  source_context: string;
  communicative_intent: string;
  diagram_type: string;
  raw_data?: Record<string, unknown> | null;
  refinement_iterations: number;
  asset_ids: string[];
}

export interface GenerateResponse {
  job_id: string;
  status: string;
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface GalleryItem {
  id: string;
  communicative_intent: string;
  diagram_type: string;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
}

export interface GalleryListResponse {
  items: GalleryItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface GalleryDetail {
  id: string;
  source_context: string;
  communicative_intent: string;
  diagram_type: string;
  image_url: string | null;
  description: string | null;
  iterations: Record<string, unknown>[] | null;
  metadata: Record<string, unknown> | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface Asset {
  id: string;
  name: string;
  file_type: string;
  thumbnail_url: string | null;
  created_at: string;
}

export interface ApiKeyStatus {
  has_key: boolean;
  key_preview: string | null;
}
