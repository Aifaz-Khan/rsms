import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { authApi } from '../../api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const { register, handleSubmit, watch, formState: { errors } } = useForm<{ password: string; confirmPassword: string }>();

  const onSubmit = async (data: { password: string }) => {
    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, password: data.password });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch {
      toast.error('Invalid or expired reset link');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-medical-bg flex items-center justify-center p-4">
        <div className="card text-center">
          <p className="text-red-600">Invalid reset link. Please request a new one.</p>
          <Link to="/forgot-password" className="btn-primary mt-4">Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-medical-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl mb-4">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input
                {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
                type="password"
                className="input"
                placeholder="Enter new password"
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                {...register('confirmPassword', {
                  required: 'Please confirm password',
                  validate: (val) => val === watch('password') || 'Passwords do not match',
                })}
                type="password"
                className="input"
                placeholder="Confirm new password"
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
