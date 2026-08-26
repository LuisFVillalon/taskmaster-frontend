export interface LearningResource {
  type: 'video' | 'article' | 'exercise';
  title: string;
  url: string;
  why: string;
  platform: string;
  activity_label: string;
}

export interface LearningResourcesResponse {
  topic: string;
  resources: LearningResource[];
  /** Present when the note didn't have enough extractable content to search with. */
  message?: string;
}
