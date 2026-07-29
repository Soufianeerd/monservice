import { useAuth } from '@/components/auth/AuthContext';

export function useRole() {
  const { user } = useAuth();
  return user?.profileType || null;
}
