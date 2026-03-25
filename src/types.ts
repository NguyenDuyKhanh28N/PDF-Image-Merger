export type PageItem = {
  id: string;
  fileId: string;
  fileName: string;
  type: 'pdf' | 'image';
  pageIndex?: number;
  thumbnailUrl: string;
  file: File;
};

export type FileGroup = {
  id: string;
  name: string;
  isExpanded: boolean;
  pages: PageItem[];
};
