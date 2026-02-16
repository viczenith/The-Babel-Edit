export function formatRole(role?: string | null) {
  if (!role) return 'Guest';
  const r = String(role).toLowerCase();

  // Robust matching: look for super + admin, or admin alone
  if (r.includes('super') && r.includes('admin')) return 'Super Admin';
  if (r.includes('super')) return 'Super Admin';
  if (r.includes('admin')) return 'Admin';

  // Fallback: capitalize words and normalize separators
  return String(role)
    .split(/[\s_-]+/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');
}
