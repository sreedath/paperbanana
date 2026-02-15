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
  | "done"
  | "error";
