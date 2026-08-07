import AuthLayout from '@/components/auth/AuthLayout';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthLayout 
      title="Créez votre compte"
      subtitle="Rejoignez-nous et commencez à développer votre activité dès aujourd'hui."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
