export interface VideoSummary {
  videoId: string;
  title: string;
  url: string;
  duration: number;
  thumb: string;
  preview: string;
}

export interface VideoDetails extends VideoSummary {
  tags: string[];
  uploadDate: string;
  views: number;
  likes: number;
  quality: string;
  bitrate?: number;
  sizeMb?: number;
  author?: string;
}

export type { VideoSummary as default };
