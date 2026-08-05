'use client';

import * as taskActions from '@/app/actions/task.actions';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TaskForm from '@/components/crm/TaskForm';
import * as userActions from '@/app/actions/user.actions';
import { User, Task } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';

export default function NewTaskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.organizationId) {
      userActions.getAllUsersAction().then(allUsers => {
        setUsers(allUsers.filter(u => u.organizationId === user.organizationId));
      });
    }
  }, [user?.organizationId]);

  const handleSubmit = async (data: Partial<Task>) => {
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    try {
      const newTask = await taskActions.createAction({
        title: data.title || '',
        description: data.description || '',
        status: data.status || 'À faire',
        priority: data.priority || 'Moyenne',
        dueDate: data.dueDate || '',
        assignedTo: data.assignedTo,
        entityType: data.entityType,
        entityId: data.entityId,
        organizationId: user.organizationId,
      });
      router.push('/tasks');
    } catch (error) {
      console.error('Erreur', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle tâche</h1>
      </div>
      <TaskForm users={users} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
