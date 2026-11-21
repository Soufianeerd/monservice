import { requireProfessional } from '@/lib/auth/session';
import { taskService } from '@/lib/services/task.service';
import { userService } from '@/lib/services/user.service';
import TasksPageClient, { type TaskWithUser } from './TasksPageClient';

/** Données chargées côté serveur : le tableau arrive rempli. */
export default async function TasksPage() {
  const { organizationId } = await requireProfessional();
  const [tasks, members] = await Promise.all([
    taskService.findByOrganization(organizationId),
    userService.listByOrganization(organizationId),
  ]);
  const names = new Map(members.map((member) => [member.id, member.name]));
  const enriched: TaskWithUser[] = tasks.map((task) => ({
    ...task,
    assignedUserName: task.assignedTo ? names.get(task.assignedTo) || 'Inconnu' : 'Non assigné',
  }));
  return <TasksPageClient initialTasks={enriched} initialUsers={members.filter((member) => member.organizationId === organizationId)} />;
}
