export interface Message {
  id: string;
  senderId: string;
  receiverId: string; // The user ID of the receiver (professional or client)
  content: string;
  read: boolean;
  createdAt: string;
  requestId?: string;
  organizationId: string; // Context: which professional/org is involved
}
