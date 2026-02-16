"use client";
import React from 'react';
import { BarChart3, Users, Eye, Settings } from 'lucide-react';

type Section =
  | 'overview'
  | 'users'
  | 'audit'
  | 'settings';

const SectionNav: React.FC<{
  active: Section;
  onChange: (s: Section) => void;
  headerId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}> = ({ active, onChange, headerId = 'superadmin-header', isOpen = false, onClose }) => {
  const iconMap: Record<Section, React.ReactNode> = {
    overview: <BarChart3 className="w-4 h-4" />,
    users: <Users className="w-4 h-4" />,
    audit: <Eye className="w-4 h-4" />,
    settings: <Settings className="w-4 h-4" />,
  };

  const items: { key: Section; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'audit', label: 'Audit Logs' },
    { key: 'settings', label: 'Settings' },
  ];

  const [topPx, setTopPx] = React.useState<number>(0);

  React.useEffect(() => {
    const updateTop = () => {
      const el = document.getElementById(headerId);
      if (el) setTopPx(Math.ceil(el.getBoundingClientRect().height) + 12);
      else setTopPx(0);
    };
    updateTop();
    window.addEventListener('resize', updateTop);
    return () => window.removeEventListener('resize', updateTop);
  }, [headerId]);

  return (
    <>
      <nav style={{ position: 'sticky', top: `${topPx}px` }} className="hidden md:block w-64 p-4 border-r h-full">
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.key}>
              <button
                onClick={() => onChange(it.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${active === it.key ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                {iconMap[it.key]}
                <span className="text-sm font-medium">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* mobile drawer */}
      <div className={`fixed inset-0 z-50 md:hidden ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
        <aside className={`absolute left-0 top-0 bottom-0 w-64 bg-white p-4 border-r transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Menu</div>
            <button onClick={onClose} className="px-2 py-1 rounded bg-gray-100">Close</button>
          </div>
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.key}>
                <button
                  onClick={() => { onChange(it.key); onClose && onClose(); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${active === it.key ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                  {iconMap[it.key]}
                  <span className="text-sm font-medium">{it.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
};

export default SectionNav;
