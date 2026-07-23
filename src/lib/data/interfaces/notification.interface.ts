export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}
