import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { User } from '../../types';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: profileErrors } } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      organization: user?.organization || '',
    },
  });

  const { register: regPassword, handleSubmit: handlePassword, watch, reset: resetPassword, formState: { errors: passwordErrors } } = useForm<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  const onProfileSubmit = async (data: { firstName: string; lastName: string; phone: string; organization: string }) => {
    try {
      const res = await authApi.updateProfile(data);
      updateUser(res.data.data as User);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const onPasswordSubmit = async (data: { currentPassword: string; newPassword: string }) => {
    try {
      await authApi.changePassword(data);
      toast.success('Password changed successfully');
      resetPassword();
    } catch {
      toast.error('Failed to change password');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account settings</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['profile', 'password'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'profile' ? 'Profile' : 'Change Password'}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleProfile(onProfileSubmit)} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input {...regProfile('firstName', { required: 'Required' })} className="input" />
              {profileErrors.firstName && <p className="text-xs text-red-500 mt-1">{profileErrors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Last Name</label>
              <input {...regProfile('lastName', { required: 'Required' })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email} disabled className="input bg-slate-50 text-slate-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...regProfile('phone')} className="input" placeholder="+1 234 567 8900" />
          </div>
          <div>
            <label className="label">Organization</label>
            <input {...regProfile('organization')} className="input" placeholder="Your organization" />
          </div>
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      )}

      {activeTab === 'password' && (
        <form onSubmit={handlePassword(onPasswordSubmit)} className="card space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input {...regPassword('currentPassword', { required: 'Required' })} type="password" className="input" />
            {passwordErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="label">New Password</label>
            <input {...regPassword('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} type="password" className="input" />
            {passwordErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword.message}</p>}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              {...regPassword('confirmPassword', {
                required: 'Required',
                validate: (val) => val === watch('newPassword') || 'Passwords do not match',
              })}
              type="password"
              className="input"
            />
            {passwordErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword.message}</p>}
          </div>
          <button type="submit" className="btn-primary">Change Password</button>
        </form>
      )}
    </div>
  );
}
