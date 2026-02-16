'use client';

import React from 'react';
import Button from '../Button/Button';

export interface Column<T> {
  key: keyof T | string;
  header: React.ReactNode;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface Action<T> {
  label: string | ((item: T) => string);
  onClick: (item: T) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | ((item: T) => 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger');
  size?: 'sm' | 'md' | 'lg';
  disabled?: (item: T) => boolean;
  loading?: (item: T) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = 'No data available',
  className = '',
}: DataTableProps<T>) {
  const getCellValue = (item: T, column: Column<T>) => {
    if (column.cell) {
      return column.cell(item);
    }
    
    const keys = column.key.toString().split('.');
    let value = item;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value?.toString() || '-';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900"
                  >
                    {getCellValue(item, column)}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      {actions.map((action, actionIndex) => {
                        const label = typeof action.label === 'function' ? action.label(item) : action.label;
                        const variant = typeof action.variant === 'function' ? action.variant(item) : action.variant;
                        return (
                          <Button
                            key={actionIndex}
                            variant={variant || 'secondary'}
                            size={action.size || 'sm'}
                            onClick={() => action.onClick(item)}
                            disabled={action.disabled?.(item)}
                            isLoading={action.loading?.(item)}
                          >
                            {label}
                          </Button>
                        );
                      })}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
