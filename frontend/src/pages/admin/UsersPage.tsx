import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../api';
import { User } from '../../types';
import { Plus, Search, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'RESEARCHER', organization: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => userApi.getAll({ search, limit: 50 }),
  });

  const users: User[] = data?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => userApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      setShowCreate(false);
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'RESEARCHER', organization: '' });
    },
    onError: () => toast.error('Failed to create user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => userApi.toggleStatus(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} users</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Create user form */}
      {showCreate && (
        <div className="card max-w-lg">
          <h3 className="font-semibold text-slate-800 mb-4">Create New User</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Role</label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="input">
                <option value="RESEARCHER">Researcher</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => createMutation.mutate(newUser)} disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9 max-w-sm"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="table-header">User</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Joined</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-slate-800">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${user.role === 'ADMIN' ? 'badge-info' : 'badge-gray'}`}>{user.role}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell text-slate-500">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleMutation.mutate(user.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this user?')) deleteMutation.mutate(user.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
