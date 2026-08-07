import AuthLayout from '@/components/auth/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout 
      title="Bon retour !"
      subtitle="Connectez-vous pour accéder à votre espace."
    >
      <LoginForm />
    </AuthLayout>
  );
}
