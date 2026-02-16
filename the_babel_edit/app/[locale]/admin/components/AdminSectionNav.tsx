"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { useProductCategories } from '@/app/hooks/useProductCategories';

type Section = 'overview' | 'dashboard' | 'products' | 'orders' | 'inventory' | 'reviews' | 'feedback' | 'product-types';

const AdminSectionNav: React.FC<{
  active: Section;
  onChange: (s: Section) => void;
  onSelectCategory?: (slug: string) => void;
  activeCategory?: string | null;
  headerId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}> = ({ active, onChange, onSelectCategory, activeCategory = null, headerId = 'admin-header', isOpen = false, onClose }) => {
  const items: { key: Section; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'dashboard', label: '🎨 Dashboard Manager' },
    { key: 'products', label: 'Products' },
    { key: 'orders', label: 'Orders' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'feedback', label: 'Feedback' },
  ];

  // Dynamic product categories used to populate the Products dropdown
  const { categories: productCategories, loading: categoriesLoading } = useProductCategories();
  const [productsOpen, setProductsOpen] = useState<boolean>(false);
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const slugify = (name: string) =>
    name
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

  // Previously this nav showed Collections; we now list product categories (dynamic)

  const [topPx, setTopPx] = useState<number>(0);

  useEffect(() => {
    const updateTop = () => {
      const el = document.getElementById(headerId);
      if (el) {
        setTopPx(Math.ceil(el.getBoundingClientRect().height) + 12);
      } else {
        setTopPx(0);
      }
    };

    updateTop();
    window.addEventListener('resize', updateTop);
    return () => window.removeEventListener('resize', updateTop);
  }, [headerId]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{ position: 'sticky', top: `${topPx}px` }} className="hidden md:block w-64 p-4 border-r h-full">
        <ul className="space-y-1">
          {items.map((it) => {
            if (it.key === 'products') {
              return (
                <li key={it.key}>
                  <div>
                    <button
                      onClick={() => setProductsOpen((s) => !s)}
                      className={`w-full text-left px-3 py-2 rounded flex items-center justify-between hover:bg-gray-50 text-gray-700`}>
                      <span>{it.label}</span>
                      <span className="ml-2">{productsOpen ? '▴' : '▾'}</span>
                    </button>

                    {productsOpen && (
                      <ul className="mt-2 ml-2 space-y-1">
                        {(!categoriesLoading && Array.isArray(productCategories) ? productCategories : []).map((cat: any) => {
                          const slug = cat.slug || cat.value || '';
                          const isColActive = activeCategory === slug;
                          return (
                            <li key={cat.id || slug}>
                              <button
                                onClick={() => onSelectCategory ? onSelectCategory(slug) : undefined}
                                className={`w-full text-left px-3 py-1 rounded ${isColActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                                {cat.name || cat.label}
                              </button>
                            </li>
                          );
                        })}
                        <li className="my-2">
                          <div className="border-b border-gray-200"></div>
                        </li>
                        <li>
                          <button
                            onClick={() => onChange('product-types')}
                            className="w-full text-left px-3 py-1 rounded font-semibold text-sm text-blue-700 hover:bg-blue-50">
                            🏷️ Manage Product Types
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </li>
              );
            }

            return (
              <li key={it.key}>
                <div>
                  <button
                    onClick={() => onChange(it.key)}
                    className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${active === it.key ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <span>{it.label}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {/* keep Quick Links for non-products area if desired - currently omitted since collections now live under Products */}
      </aside>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 md:hidden ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
        <div className={`absolute inset-0 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
        <aside className={`absolute left-0 top-0 bottom-0 w-64 bg-white p-4 border-r transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Menu</div>
            <button onClick={onClose} className="px-2 py-1 rounded bg-gray-100">Close</button>
          </div>
          <ul className="space-y-1">
            {items.map((it) => {
              if (it.key === 'products') {
                return (
                  <li key={it.key}>
                    <div>
                      <button
                        onClick={() => setProductsOpen((s) => !s)}
                        className={`w-full text-left px-3 py-2 rounded flex items-center justify-between hover:bg-gray-50 text-gray-700`}>
                        <span>{it.label}</span>
                        <span className="ml-2">{productsOpen ? '▴' : '▾'}</span>
                      </button>

                      {productsOpen && (
                        <ul className="mt-2 ml-2 space-y-1">
                          {( !categoriesLoading && Array.isArray(productCategories) ? productCategories : []).map((cat: any) => {
                            const slug = cat.slug || cat.value || '';
                            return (
                              <li key={cat.id || slug}>
                                <button
                                  onClick={() => {
                                    onSelectCategory ? onSelectCategory(slug) : undefined;
                                    onClose && onClose();
                                  }}
                                  className="w-full text-left px-3 py-1 rounded hover:bg-gray-50 text-gray-700">
                                  {cat.name || cat.label}
                                </button>
                              </li>
                            );
                          })}
                          <li className="my-2">
                            <div className="border-b border-gray-200"></div>
                          </li>
                          <li>
                            <button
                              onClick={() => {
                                onChange('product-types');
                                onClose && onClose();
                              }}
                              className="w-full text-left px-3 py-1 rounded font-semibold text-sm text-blue-700 hover:bg-blue-50">
                              🏷️ Manage Product Types
                            </button>
                          </li>
                        </ul>
                      )}
                    </div>
                  </li>
                );
              }

              return (
                <li key={it.key}>
                  <button
                    onClick={() => {
                      onChange(it.key);
                      onClose && onClose();
                    }}
                    className={`w-full text-left px-3 py-2 rounded ${active === it.key ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    {it.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </>
  );
};

export default AdminSectionNav;
