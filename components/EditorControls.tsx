
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

interface EditorControlsProps {
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  onBackgroundChange: (prompt: string) => void;
  onImageEdit: (prompt: string) => void;
  isLoading: boolean;
}

const BACKGROUND_OPTIONS = [
  { name: 'Outdoor', prompt: 'a vibrant, realistic outdoor setting with natural light' },
  { name: 'Indoor', prompt: 'a modern, well-lit indoor room with stylish decor' },
  { name: 'Studio', prompt: 'an elegant, high-end studio setting featuring a white fluted column, soft sheer white fabric drapes, and a floral arrangement with white and peach flowers on a pedestal, with a clean white floor' },
  { name: 'Aesthetic', prompt: 'an aesthetic, visually pleasing background with soft colors and textures' },
  { name: 'Urban', prompt: 'a stylish urban city street background, slightly blurred' },
  { name: 'Nature', prompt: 'a beautiful natural landscape, like a serene forest or a field of flowers' },
];

const EditorControls: React.FC<EditorControlsProps> = ({ 
  onSelectPose,
  poseInstructions,
  currentPoseIndex,
  onBackgroundChange,
  onImageEdit,
  isLoading,
}) => {
  const [inlineEditPrompt, setInlineEditPrompt] = useState('');

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inlineEditPrompt.trim() && !isLoading) {
        onImageEdit(inlineEditPrompt.trim());
        setInlineEditPrompt('');
    }
  };

  return (
    <div className="flex flex-col gap-6">
        
        {/* Poses */}
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 px-1">Pose</h3>
          <div className="flex flex-wrap gap-2">
            {poseInstructions.map((pose, index) => (
              <button
                key={pose}
                onClick={() => onSelectPose(index)}
                disabled={isLoading}
                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap ${
                  index === currentPoseIndex 
                    ? 'bg-gray-900 text-white cursor-default' 
                    : 'bg-white text-gray-700 hover:bg-gray-200/60 border border-gray-300/80 disabled:opacity-50'
                }`}
              >
                {pose}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-px bg-gray-200"></div>

        {/* Backgrounds */}
        <div>
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 px-1">Background</h3>
            <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                {BACKGROUND_OPTIONS.map(option => (
                    <button
                        key={option.name}
                        onClick={() => onBackgroundChange(option.prompt)}
                        disabled={isLoading}
                        className="px-3 py-2 text-sm text-center font-semibold rounded-lg transition-colors whitespace-nowrap bg-white text-gray-700 hover:bg-gray-200/60 border border-gray-300/80 disabled:opacity-50"
                        title={option.name}
                    >
                        {option.name}
                    </button>
                ))}
            </div>
        </div>
        
        <div className="w-full h-px bg-gray-200"></div>

        {/* Quick Edit */}
        <div>
           <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3 px-1">Quick Edit</h3>
           <form onSubmit={handleEditSubmit} className="flex flex-col items-stretch gap-2">
              <input
                type="text"
                value={inlineEditPrompt}
                onChange={(e) => setInlineEditPrompt(e.target.value)}
                placeholder="e.g., add a necklace"
                className="w-full h-10 bg-white border border-gray-300/80 rounded-lg px-4 py-2 text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inlineEditPrompt.trim()}
                className="h-10 px-5 bg-gray-900 text-white font-semibold rounded-lg text-base hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </form>
        </div>

      </div>
  );
};

export default EditorControls;
