'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getLoginErrorMessage = (error: any) => {
    const rawMessage = (error?.message || '').toLowerCase();

    if (error?.status === 429) {
      return 'Too many login attempts. Please wait a few minutes and try again.';
    }

    if (rawMessage.includes('email not confirmed')) {
      return 'Email not confirmed yet. Please check your inbox and verify your account.';
    }

    if (error?.status === 400) {
      if (rawMessage.includes('invalid login credentials')) {
        return 'Invalid email or password.';
      }

      return error?.message || 'Login request was rejected.';
    }

    return error?.message || 'Login failed';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(getLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        placeholder="••••••••"
      />
      <Button
        type="submit"
        loading={loading}
        variant="primary"
        size="md"
        className="w-full mt-6"
      >
        Sign In
      </Button>
      <p className="text-center pw-subtext text-sm">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-[#6367FF] hover:underline font-semibold">
          Sign up
        </Link>
      </p>
    </form>
  );
}

