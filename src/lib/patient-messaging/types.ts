export interface PatientPortalMessageDTO {
  id: string;
  organizationId: string;
  patientId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  senderName?: string;
  senderRole?: 'practitioner' | 'patient' | 'representative';
  createdAt: string;
}
