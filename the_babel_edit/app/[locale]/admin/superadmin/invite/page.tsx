"use client";
import React, { useEffect, useState } from 'react';
import AdminProtectedRoute from '@/app/components/AdminProtectedRoute';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'react-hot-toast';

const InviteTokensPage: React.FC = () => {
  const { user, authenticatedFetch } = useAuth();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastToken, setLastToken] = useState<{ id: string; token: string; expiresAt: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchTokens();
  }, [user]);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/admin/superadmin/tokens', { method: 'GET' });
      setTokens(res.tokens || []);
    } catch (err) {
      console.error('Failed to load tokens', err);
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await authenticatedFetch('/admin/superadmin/tokens', { method: 'POST', body: { expiresInHours: 24 } });
      // API returns { id, token, expiresAt }
      setLastToken(res);
      fetchTokens();
    } catch (err) {
      console.error('Create token failed', err);
      toast.error((err as any)?.message || 'Create failed');
    } finally { setCreating(false); }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this token?')) return;
    try {
      await authenticatedFetch(`/admin/superadmin/tokens/${id}/revoke`, { method: 'POST' });
      fetchTokens();
    } catch (err) {
      console.error('Revoke failed', err);
      toast.error('Revoke failed');
    }
  };

  if (!user) return null;

  // Only allow primary super admin to access this page; backend also enforces it
  if ((user.role || '').toLowerCase() !== 'super_admin' || !user.isPrimary) {
    return (
      <AdminProtectedRoute>
        <div className="p-6 max-w-4xl mx-auto">You do not have access to this page.</div>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Super Admin Invite Tokens</h1>

        <div className="mb-4 flex items-center gap-3">
          <button className="px-4 py-2 bg-black text-white rounded" onClick={handleCreate} disabled={creating}>
            {creating ? 'Generating…' : 'Generate Invite Token'}
          </button>
          <div className="text-sm text-gray-600">Tokens are single-use and expire after 24 hours.</div>
        </div>

        {lastToken && (
          <div className="mb-4 p-4 border rounded bg-yellow-50">
            <div className="font-medium">Token (showing once):</div>
            <div className="mt-2 break-all font-mono bg-white p-2 rounded">{lastToken.token}</div>
            <div className="text-sm text-gray-500 mt-1">Expires at: {new Date(lastToken.expiresAt).toLocaleString()}</div>
          </div>
        )}

        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-2">Active tokens</h2>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th>ID</th>
                  <th>Created At</th>
                  <th>Expires At</th>
                  <th>Used At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tokens.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-500">No tokens</td></tr>
                )}
                {tokens.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2 break-all">{t.id}</td>
                    <td className="py-2">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="py-2">{new Date(t.expiresAt).toLocaleString()}</td>
                    <td className="py-2">{t.usedAt ? new Date(t.usedAt).toLocaleString() : '-'}</td>
                    <td className="py-2">
                      {!t.usedAt && !t.revoked && (
                        <button className="px-3 py-1 text-sm border rounded" onClick={() => handleRevoke(t.id)}>Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminProtectedRoute>
  );
};

export default InviteTokensPage;
