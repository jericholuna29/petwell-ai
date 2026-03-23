import AuthLayout from '@/components/layout/AuthLayout';
import RegisterForm from '@/components/forms/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthLayout title="Create Account">
      <RegisterForm />
    </AuthLayout>
  );
}
