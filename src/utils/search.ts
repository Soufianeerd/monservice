export interface SearchResult {
  score?: number;
  link?: string;
  id: string;
  type: 'CLIENT' | 'CONTACT' | 'DEAL' | 'TASK' | 'PRODUCT' | 'INVOICE';
  title: string;
  subtitle: string;
  url: string;
}
