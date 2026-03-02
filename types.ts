export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  data: string; // Base64 string
  size: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  structure: string;
}

export interface GenerationConfig {
  tone: 'strict' | 'polite' | 'summary';
  detailLevel: 'high' | 'medium' | 'low';
}

export type ProcessingStatus = 'idle' | 'uploading' | 'analyzing' | 'generating' | 'completed' | 'error';
