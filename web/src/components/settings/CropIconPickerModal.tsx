'use client';

import React, { useState } from 'react';
import { CROP_CATEGORIES } from '../layout/Sidebar';
import { X, Search } from 'lucide-react';
import EmojiIcon from '../ui/EmojiIcon';

interface CropIconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (crop: { name: string; icon: string }) => void;
}

export default function CropIconPickerModal({ isOpen, onClose, onSelect }: CropIconPickerModalProps) {
  const [activeCategory, setActiveCategory] = useState(CROP_CATEGORIES[0].category);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');

  if (!isOpen) return null;

  const handleSelectPredefined = (name: string, icon: string) => {
    onSelect({ name, icon });
    onClose();
  };

  const handleSaveCustom = () => {
    if (customName.trim() && selectedIcon) {
      onSelect({ name: customName.trim(), icon: selectedIcon });
      onClose();
    }
  };

  const filteredCategories = CROP_CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(item => item.name.includes(searchQuery))
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-primary">Select Crop Icon</h2>
            <p className="text-sm text-gray-500 mt-1">Choose an icon that best represents your crop.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
          
          {/* Custom Crop Input Area */}
          <div className="mb-8 p-5 bg-light rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Add Custom Crop</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-14 h-14 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-3xl shadow-inner">
                  {selectedIcon ? <EmojiIcon emoji={selectedIcon} size={32} /> : <span className="text-gray-300 text-sm">Icon</span>}
                </div>
                <div className="flex-1 sm:hidden">
                  <p className="text-xs text-gray-500">Pick an icon below</p>
                </div>
              </div>
              <input 
                type="text" 
                placeholder="Enter crop name (e.g. Shine Muscat)" 
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1 w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
              />
              <button 
                onClick={handleSaveCustom}
                disabled={!selectedIcon || !customName.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
              >
                Add Custom
              </button>
            </div>
            {!selectedIcon && (
              <p className="text-xs text-secondary mt-3 font-medium flex items-center gap-1">
                <i className="mdi mdi-information"></i> Please select an icon from the list below first.
              </p>
            )}
          </div>

          <hr className="border-gray-100 mb-6" />

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search icons..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Categories Tabs (Desktop) / Select (Mobile) */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
            {CROP_CATEGORIES.map(cat => (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  activeCategory === cat.category
                    ? 'bg-secondary text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat.category.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Icon Grid */}
          <div className="space-y-8 mt-6">
            {(searchQuery ? filteredCategories : CROP_CATEGORIES.filter(c => c.category === activeCategory)).map(category => (
              <div key={category.category} className="animate-[fadeIn_0.3s_ease-out]">
                {searchQuery && <h4 className="font-bold text-gray-800 mb-4">{category.category}</h4>}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {category.items.map(item => (
                    <button
                      key={item.name}
                      onClick={() => {
                        if (customName.trim()) {
                          setSelectedIcon(item.icon);
                        } else {
                          handleSelectPredefined(item.name, item.icon);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 h-28
                        ${selectedIcon === item.icon && customName.trim()
                          ? 'bg-secondary/10 border-secondary ring-2 ring-secondary/50 shadow-md transform scale-105'
                          : 'bg-white border-gray-200 hover:border-secondary hover:shadow-lg hover:-translate-y-1'
                        }
                      `}
                    >
                      <span className="mb-2"><EmojiIcon emoji={item.icon} size={36} /></span>
                      <span className="text-xs font-semibold text-gray-700 text-center leading-tight break-keep">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {searchQuery && filteredCategories.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-4">🔍</div>
                <p>No icons found matching "{searchQuery}"</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
