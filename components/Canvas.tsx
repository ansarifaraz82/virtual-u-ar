
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { RotateCcwIcon, Undo2Icon, Redo2Icon, DownloadIcon, RefreshCwIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';
import { downloadMedia } from '../lib/utils';

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onUndo: () => void;
  onRedo: () => void;
  onRegenerate: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canRegenerate: boolean;
}

const Canvas: React.FC<CanvasProps> = ({ 
  displayImageUrl, 
  onStartOver, 
  isLoading, 
  loadingMessage, 
  onUndo,
  onRedo,
  onRegenerate,
  canUndo,
  canRedo,
  canRegenerate,
}) => {

  const handleDownload = () => {
    if (!displayImageUrl) return;
    downloadMedia(displayImageUrl, 'virtual-try-on.png');
  };

  return (
    <div className="w-full flex items-center justify-center p-4 relative animate-zoom-in group flex-grow min-h-[500px] md:min-h-[700px]">
      {/* Top Left Controls */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <button 
            onClick={onStartOver}
            className="flex items-center justify-center text-center bg-white/60 border border-gray-300/80 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white hover:border-gray-400 active:scale-95 text-sm backdrop-blur-sm"
        >
            <RotateCcwIcon className="w-4 h-4 mr-2" />
            Start Over
        </button>
        <div className="flex items-center bg-white/60 border border-gray-300/80 rounded-full p-1 backdrop-blur-sm shadow-sm">
            <button
                onClick={onUndo}
                disabled={!canUndo || isLoading}
                className="p-2 rounded-full hover:bg-white/80 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Undo last action"
            >
                <Undo2Icon className="w-5 h-5 text-gray-800" />
            </button>
            <div className="w-px h-5 bg-gray-300/80 mx-1"></div>
            <button
                onClick={onRegenerate}
                disabled={!canRegenerate || isLoading}
                className="p-2 rounded-full hover:bg-white/80 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Regenerate last result"
            >
                <RefreshCwIcon className="w-5 h-5 text-gray-800" />
            </button>
            <div className="w-px h-5 bg-gray-300/80 mx-1"></div>
            <button
                onClick={onRedo}
                disabled={!canRedo || isLoading}
                className="p-2 rounded-full hover:bg-white/80 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Redo last action"
            >
                <Redo2Icon className="w-5 h-5 text-gray-800" />
            </button>
            <div className="w-px h-5 bg-gray-300/80 mx-1"></div>
            <button
                onClick={handleDownload}
                disabled={isLoading || !displayImageUrl}
                className="p-2 rounded-full hover:bg-white/80 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Download image"
            >
                <DownloadIcon className="w-5 h-5 text-gray-800" />
            </button>
        </div>
      </div>

      {/* Image Display or Placeholder */}
      <div className="relative w-full h-full flex items-center justify-center">
        {displayImageUrl ? (
          <img
            key={displayImageUrl} // Use key to force re-render and trigger animation on image change
            src={displayImageUrl}
            alt="Virtual try-on model"
            className="max-w-full max-h-full object-contain transition-opacity duration-500 animate-fade-in rounded-lg shadow-2xl shadow-black/10"
          />
        ) : (
            <div className="w-[400px] h-[600px] bg-gray-100/50 border border-gray-200 rounded-lg flex flex-col items-center justify-center">
              <Spinner />
              <p className="text-md font-serif text-gray-600 mt-4">Loading Model...</p>
            </div>
        )}
        
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <Spinner />
                  {loadingMessage && (
                      <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                  )}
              </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Canvas;
