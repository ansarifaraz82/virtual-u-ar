/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { XIcon, DownloadIcon } from './icons';

interface VideoModalProps {
    videoUrl: string;
    onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ videoUrl, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full z-10 transition-colors"
                    aria-label="Close video modal"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <div className="flex-grow bg-black flex items-center justify-center relative">
                    <video 
                        src={videoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className="max-h-[80vh] w-full" 
                    />
                </div>
                <div className="p-4 bg-white border-t flex justify-between items-center">
                    <p className="text-gray-600 text-sm font-medium">Generated with Veo</p>
                    <a 
                        href={videoUrl} 
                        download="veo-generation.mp4" 
                        className="flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                    >
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Download Video
                    </a>
                </div>
            </div>
        </div>
    )
}
export default VideoModal;