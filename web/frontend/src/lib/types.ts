export interface HistoryItem {
  id: string;
  caption: string;
  diagramType: string;
  sourceContext: string;
  description: string;
  imageDataUrl: string;
  thumbnailDataUrl: string;
  iterations: number;
  createdAt: string;
}

export type PipelineStatus =
  | "idle"
  | "planning"
  | "generating"
  | "critiquing"
  | "branding"
  | "done"
  | "error";

export interface BrandingOptions {
  showLogo: boolean;
  logoDataUrl: string | null;
  showUrl: boolean;
  urlText: string;
}

export interface IterationImage {
  dataUrl: string;
  label: string;
}
