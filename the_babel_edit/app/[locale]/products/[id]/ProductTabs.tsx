import React, { useState } from 'react';

interface Tab {
  label: string;
  content: React.ReactNode;
}

interface ProductTabsProps {
  tabs: Tab[];
}

const ProductTabs: React.FC<ProductTabsProps> = ({ tabs }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className="w-full">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab, idx) => (
            <button
              key={tab.label}
              onClick={() => setActiveIdx(idx)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeIdx === idx
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6 text-gray-700 text-base">
        {tabs[activeIdx]?.content}
      </div>
    </div>
  );
};

export default ProductTabs;
 