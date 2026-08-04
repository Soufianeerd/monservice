'use client';

import * as taskActions from '@/app/actions/task.actions';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TaskForm from '@/components/crm/TaskForm';

import * as userActions from '@/app/actions/user.actions';
import { Task, User } from '@/lib/data/interfaces';
import { useAuth } from '@/components/auth/AuthContext';

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.organizationId) return;
      const t = await taskActions.findByIdAction(params.id as string, user.organizationId);
      const usersData = await userActions.getAllUsersAction();
      
      if (t) {
        setTask(t);
        setUsers(usersData.filter(u => u.organizationId === user.organizationId));
      } else {
        router.push('/tasks');
      }
      setLoading(false);
    }
    load();
  }, [params.id, user, router]);

  const handleSubmit = async (data: Partial<Task>) => {
    setIsSubmitting(true);
    try {
      if (!user?.organizationId) return;
      await taskActions.updateAction(params.id as string, user.organizationId, {
        ...data,
      });
      router.push('/tasks');
    } catch (error) {
      console.error('Erreur', error);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Chargement...</div>;
  if (!task) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier la tâche</h1>
      </div>
      <TaskForm initialData={task} users={users} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
