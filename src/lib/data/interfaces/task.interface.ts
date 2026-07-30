export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'todo';
export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskEntityType = 'client' | 'contact' | 'deal' | 'invoice' | 'quote' | null;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedTo?: string; // User ID
  organizationId: string;
  entityType?: TaskEntityType;
  entityId?: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
  comments?: { id: string; authorId: string; text: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}
