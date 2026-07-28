export type RequestStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';

export interface Request {
  id: string;
  title: string;
  description: string;
  category: string;
  budget?: number;
  location: string;
  preferredDate?: string;
  status: RequestStatus;
  clientId: string;
  organizationId?: string; // Optional until a quote is accepted
  createdAt: string;
  updatedAt: string;
  quoteIds?: string[];
  isPublic?: boolean;
}
