/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { DownloadIcon, PlayIcon, FilmIcon } from './icons';
import { CreationItem } from '../types';
import { downloadMedia } from '../lib/utils';

interface RecentCreationsProps {
  items: CreationItem[];
  onView: (item: CreationItem) => void;
}

const RecentCreations: React.FC<RecentCreationsProps> = ({ items, onView }) => {
  if (items.length === 0) {
    return null; // Don't render anything if there are no items
  }

  const handleDownload = (e: React.MouseEvent, item: CreationItem, index: number) => {
    e.stopPropagation();
    const filename = `creation-${items.length - index}.${item.type === 'video' ? 'mp4' : 'png'}`;
    downloadMedia(item.url, filename);
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 border-b border-gray-400/50 pb-2 mb-3">Recent Creations</h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div 
            key={item.id} 
            className="relative aspect-square group cursor-pointer"
            onClick={() => onView(item)}
          >
            {item.type === 'video' ? (
                 <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                     <video src={item.url} className="w-full h-full object-cover opacity-80" muted playsInline />
                     <div className="absolute inset-0 flex items-center justify-center">
                         <div className="bg-white/30 backdrop-blur-sm p-2 rounded-full">
                            <PlayIcon className="w-6 h-6 text-white" fill="currentColor" />
                         </div>
                     </div>
                     <div className="absolute top-1 right-1 bg-black/60 p-1 rounded">
                        <FilmIcon className="w-3 h-3 text-white" />
                     </div>
                 </div>
            ) : (
                <img 
                    src={item.url} 
                    className="aspect-square w-full h-full object-cover rounded-lg bg-gray-200" 
                    alt={`Recent creation ${i + 1}`} 
                />
            )}

            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <button 
                onClick={(e) => handleDownload(e, item, i)} 
                className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center text-gray-800 hover:bg-white"
                aria-label="Download"
                title="Download"
              >
                <DownloadIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentCreations;
