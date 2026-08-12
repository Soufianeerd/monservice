import AuthLayout from '@/components/auth/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <AuthLayout 
      title="Bon retour !"
      subtitle="Connectez-vous pour accéder à votre espace."
    >
      <Suspense fallback={<div>Chargement...</div>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
