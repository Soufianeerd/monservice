'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TaskForm from '@/components/crm/TaskForm';
import { taskRepository } from '@/lib/data';
import { userService } from '@/lib/services/user.service';
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
      const [t, usersData] = await Promise.all([
        taskRepository.getById(params.id as string),
        userService.getAllUsers()
      ]);
      
      if (t && t.organizationId === user.organizationId) {
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
      await taskRepository.update(params.id as string, {
        ...data,
        updatedAt: new Date().toISOString(),
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
