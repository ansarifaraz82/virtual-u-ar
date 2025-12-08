
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobePanel';
import OutfitStack from './components/OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation, editImageWithPrompt } from './services/geminiService';
import { OutfitLayer, WardrobeItem, CreationItem } from './types';
import { ChevronDownIcon, ChevronUpIcon, DownloadIcon, AlertTriangleIcon, PlayIcon, SmartphoneIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import Footer from './components/Footer';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';
import RecentCreations from './components/RecentCreations';
import EditorControls from './components/EditorControls';

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Looking over the shoulder",
  "Side profile view",
  "Walking towards camera",
  "Close-up upper body, focused on outfit",
  "Leaning against a wall",
  "Sitting on a sofa or couch",
  "Dynamic action pose, mid-stride",
  "Full backside view",
];

const SAVED_OUTFIT_KEY = 'virtual-try-on-outfit';
const STUDIO_PROMPT = "an elegant, high-end studio setting featuring a white fluted column, soft sheer white fabric drapes, and a floral arrangement with white and peach flowers on a pedestal, with a clean white floor";

type LastAction = 
  | { type: 'try-on'; garmentFile: File; garmentInfo: WardrobeItem }
  | { type: 'pose'; poseInstruction: string, baseImage: string }
  | { type: 'edit'; prompt: string, baseImage: string };

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQueryList.addEventListener('change', listener);
    
    // Sync state on effect creation in case it changed since initialization
    setMatches(mediaQueryList.matches);

    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
};


const App: React.FC = () => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [hasSavedOutfit, setHasSavedOutfit] = useState(false);
  const [recentCreations, setRecentCreations] = useState<CreationItem[]>([]);
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [currentBackground, setCurrentBackground] = useState<string>('');
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const savedData = localStorage.getItem(SAVED_OUTFIT_KEY);
    setHasSavedOutfit(!!savedData);
  }, []);

  // Save state to local storage whenever relevant data changes
  useEffect(() => {
    // Only save images (videos are blobs and don't persist)
    const imagesOnlyCreations = recentCreations.filter(item => item.type === 'image');
    
    // Filter out outfit history layers that use blob URLs for garments to prevent saving broken links
    const safeOutfitHistory = outfitHistory.map(layer => {
        if (layer.garment && layer.garment.url.startsWith('blob:')) {
             // If it's a blob, we can't save it effectively without base64 conversion which is heavy.
             // We'll keep the layer but maybe nullify the garment so the app doesn't try to fetch a dead blob on reload.
             return { ...layer, garment: null };
        }
        return layer;
    });

    if (imagesOnlyCreations.length === 0 && safeOutfitHistory.length === 0) return;

    const trySave = (creations: CreationItem[]) => {
        try {
            const data = {
                outfitHistory: safeOutfitHistory,
                currentOutfitIndex,
                recentCreations: creations,
                currentBackground,
            };
            localStorage.setItem(SAVED_OUTFIT_KEY, JSON.stringify(data));
            setHasSavedOutfit(true);
            return true;
        } catch (e) {
            return false;
        }
    };

    // Progressive fallback strategy to handle storage quotas (QuotaExceededError)
    // 1. Try saving all recent creations
    if (!trySave(imagesOnlyCreations)) {
        // 2. Try saving most recent 5
        if (!trySave(imagesOnlyCreations.slice(0, 5))) {
            // 3. Try saving most recent 1
            if (!trySave(imagesOnlyCreations.slice(0, 1))) {
                // 4. Try saving just the outfit history (no recent creations)
                if (!trySave([])) {
                     console.warn("LocalStorage full. Could not save session progress.");
                }
            }
        }
    }
  }, [recentCreations, outfitHistory, currentOutfitIndex, currentBackground]);

  const activeOutfitLayers = useMemo(() => 
    outfitHistory.slice(0, currentOutfitIndex + 1), 
    [outfitHistory, currentOutfitIndex]
  );
  
  const activeGarmentIds = useMemo(() => 
    activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], 
    [activeOutfitLayers]
  );
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;

    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    // Return the image for the current pose, or fallback to the first available image for the current layer.
    // This ensures an image is shown even while a new pose is generating.
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, modelImageUrl]);

  const addRecentCreation = (url: string, type: 'image' | 'video') => {
    setRecentCreations(prev => [{ id: Date.now().toString(), url, type }, ...prev].slice(0, 12));
  };

  const handleModelFinalized = (url: string) => {
    setModelImageUrl(url);
    setOutfitHistory([{
      garment: null,
      poseImages: { [POSE_INSTRUCTIONS[0]]: url }
    }]);
    setCurrentOutfitIndex(0);
    // Initialize with the detailed studio prompt so subsequent generations match the first one
    setCurrentBackground(STUDIO_PROMPT);
    addRecentCreation(url, 'image');
  };

  const handleAttemptStartOver = () => {
    if (recentCreations.length > 0) {
      setShowStartOverModal(true);
    } else {
      handleConfirmStartOver();
    }
  };

  const handleConfirmStartOver = () => {
    setShowStartOverModal(false);
    setModelImageUrl(null);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setWardrobe(defaultWardrobe);
    setRecentCreations([]);
    setLastAction(null);
    setCurrentBackground('');
    localStorage.removeItem(SAVED_OUTFIT_KEY);
    setHasSavedOutfit(false);
  };

  const handleCancelStartOver = () => {
    setShowStartOverModal(false);
  };
  
  const handleDownloadAll = async () => {
    for (const [index, item] of recentCreations.entries()) {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = `creation-${recentCreations.length - index}.${item.type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Small delay to help browsers handle multiple downloads
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const handleLoadOutfit = () => {
    const savedData = localStorage.getItem(SAVED_OUTFIT_KEY);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            const { outfitHistory: savedHistory, currentOutfitIndex: savedIndex } = parsed;
            let savedRecent: CreationItem[] = [];

            if (parsed.recentCreations) {
                savedRecent = parsed.recentCreations;
            } else if (parsed.recentImages && Array.isArray(parsed.recentImages)) {
                 // Migrate legacy data
                 savedRecent = parsed.recentImages.map((url: string, i: number) => ({
                     id: `legacy-${i}`,
                     url,
                     type: 'image'
                 }));
            }

            if (Array.isArray(savedHistory) && savedHistory.length > 0) {
                const baseLayer = savedHistory[0];
                const modelUrl = Object.values(baseLayer.poseImages)[0] as string;
                
                if (modelUrl) {
                    setModelImageUrl(modelUrl);
                    setOutfitHistory(savedHistory);
                    setCurrentOutfitIndex(savedIndex ?? 0);
                    setRecentCreations(savedRecent);
                    setLastAction(null);
                    if (parsed.currentBackground) {
                        setCurrentBackground(parsed.currentBackground);
                    }
                    
                    // Also restore personal wardrobe items from the saved history
                    const savedCustomItems = savedHistory
                      .map((layer: any) => layer.garment)
                      .filter((g: any) => g && g.id.startsWith('custom-')) as WardrobeItem[];
                    
                    setWardrobe(prev => {
                      const existingIds = new Set(prev.map(item => item.id));
                      const newItems = savedCustomItems.filter(item => !existingIds.has(item.id));
                      return [...prev, ...newItems];
                    });
                } else {
                  throw new Error("Saved data is missing a valid model URL.");
                }
            } else {
              throw new Error("Saved data is malformed or empty.");
            }
        } catch (e: any) {
            console.error("Failed to load or parse saved outfit:", e);
            localStorage.removeItem(SAVED_OUTFIT_KEY);
            setHasSavedOutfit(false);
            setError(getFriendlyErrorMessage(e as any, 'Could not load saved outfit'));
        }
    }
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;

    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
        setCurrentOutfitIndex(prev => prev + 1);
        setCurrentPoseIndex(0);
        return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Adding ${garmentInfo.name}...`);
    setLastAction({ type: 'try-on', garmentFile, garmentInfo });

    try {
      // Pass the current background to ensure it is preserved during try-on
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl as string, garmentFile, currentBackground);
      addRecentCreation(newImageUrl, 'image');
      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        poseImages: { [currentPoseInstruction]: newImageUrl } 
      };

      setOutfitHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, currentOutfitIndex + 1);
        return [...newHistory, newLayer];
      });
      setCurrentOutfitIndex(prev => prev + 1);
      setCurrentPoseIndex(0);
      
      setWardrobe(prev => {
        if (prev.find(item => item.id === garmentInfo.id)) {
            return prev;
        }
        return [...prev, garmentInfo];
      });
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err as any, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex, currentBackground]);

  const handleUndo = () => {
    if (currentOutfitIndex > 0) {
      setCurrentOutfitIndex(prevIndex => prevIndex - 1);
      setCurrentPoseIndex(0);
    }
  };

  const handleRedo = () => {
    if (currentOutfitIndex < outfitHistory.length - 1) {
      setCurrentOutfitIndex(prevIndex => prevIndex + 1);
      setCurrentPoseIndex(0);
    }
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }

    const baseImageForPoseChange = Object.values(currentLayer.poseImages)[0];
    if (!baseImageForPoseChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    setLastAction({ type: 'pose', poseInstruction, baseImage: baseImageForPoseChange });
    
    const prevPoseIndex = currentPoseIndex;
    setCurrentPoseIndex(newIndex);

    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, poseInstruction, currentBackground);
      addRecentCreation(newImageUrl, 'image');
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const layerToUpdate = newHistory[currentOutfitIndex];
        const updatedLayer: OutfitLayer = {
          ...layerToUpdate,
          poseImages: {
            ...layerToUpdate.poseImages,
            [poseInstruction]: newImageUrl,
          },
        };
        newHistory[currentOutfitIndex] = updatedLayer;
        return newHistory;
      });
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err as any, 'Failed to change pose'));
      setCurrentPoseIndex(prevPoseIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex, currentBackground]);

  const handleImageEdit = useCallback(async (prompt: string) => {
    if (!displayImageUrl || isLoading) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Applying edit: "${prompt}"`);
    setLastAction({ type: 'edit', prompt, baseImage: displayImageUrl });

    try {
        const newImageUrl = await editImageWithPrompt(displayImageUrl as string, prompt);
        addRecentCreation(newImageUrl, 'image');
        
        setOutfitHistory(prevHistory => {
            const currentLayer = prevHistory[currentOutfitIndex];
            if (!currentLayer) return prevHistory;

            const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
            
            const newEditedLayer: OutfitLayer = {
                garment: currentLayer.garment,
                poseImages: {
                    ...currentLayer.poseImages,
                    [currentPoseInstruction]: newImageUrl,
                },
            };
            
            const historyUpToCurrent = prevHistory.slice(0, currentOutfitIndex + 1);
            return [...historyUpToCurrent, newEditedLayer];
        });
        setCurrentOutfitIndex(prev => prev + 1);

    } catch (err: any) {
        setError(getFriendlyErrorMessage(err as any, 'Failed to edit image'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }

  }, [displayImageUrl, isLoading, currentOutfitIndex, currentPoseIndex]);
  
  const handleBackgroundChange = useCallback(async (prompt: string) => {
    if (!displayImageUrl || isLoading) return;
    const fullPrompt = `Change the background to ${prompt}. The subject should be perfectly preserved.`;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing background...`);
    setLastAction({ type: 'edit', prompt: fullPrompt, baseImage: displayImageUrl });

    try {
        const newImageUrl = await editImageWithPrompt(displayImageUrl as string, fullPrompt);
        addRecentCreation(newImageUrl, 'image');
        
        setOutfitHistory(prevHistory => {
            const currentLayer = prevHistory[currentOutfitIndex];
            if (!currentLayer) return prevHistory;

            const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
            
            const newEditedLayer: OutfitLayer = {
                garment: currentLayer.garment,
                poseImages: {
                    ...currentLayer.poseImages,
                    [currentPoseInstruction]: newImageUrl,
                },
            };
            
            const historyUpToCurrent = prevHistory.slice(0, currentOutfitIndex + 1);
            return [...historyUpToCurrent, newEditedLayer];
        });
        setCurrentOutfitIndex(prev => prev + 1);
        setCurrentBackground(prompt);

    } catch (err: any) {
        setError(getFriendlyErrorMessage(err as any, 'Failed to change background'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }

  }, [displayImageUrl, isLoading, currentOutfitIndex, currentPoseIndex]);

  const handleRegenerate = useCallback(async () => {
    if (!lastAction || isLoading || currentOutfitIndex === 0) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage('Regenerating...');

    try {
        let newImageUrl: string;
        let poseKey = POSE_INSTRUCTIONS[currentPoseIndex];
        
        const previousLayer = outfitHistory[currentOutfitIndex - 1];
        if (!previousLayer) throw new Error("Previous layer not found");
        const baseImageForTryOn = Object.values(previousLayer.poseImages)[0] as string;

        switch (lastAction.type) {
            case 'try-on':
                newImageUrl = await generateVirtualTryOnImage(baseImageForTryOn, lastAction.garmentFile, currentBackground);
                break;
            case 'pose':
                newImageUrl = await generatePoseVariation(lastAction.baseImage, lastAction.poseInstruction, currentBackground);
                poseKey = lastAction.poseInstruction;
                break;
            case 'edit':
                newImageUrl = await editImageWithPrompt(lastAction.baseImage, lastAction.prompt);
                break;
            default:
                throw new Error("Unknown action type for regeneration");
        }

        addRecentCreation(newImageUrl, 'image');

        // Update the current layer with the regenerated image
        setOutfitHistory(prevHistory => {
            const newHistory = [...prevHistory];
            const layerToUpdate = newHistory[currentOutfitIndex];
            
            const updatedLayer: OutfitLayer = {
                ...layerToUpdate,
                poseImages: {
                    ...layerToUpdate.poseImages,
                    [poseKey]: newImageUrl
                }
            };

            // For try-on, we want to replace all poses as the base has changed.
            if (lastAction.type === 'try-on') {
              updatedLayer.poseImages = { [poseKey]: newImageUrl };
            }
            
            newHistory[currentOutfitIndex] = updatedLayer;
            return newHistory;
        });

    } catch (err: any) {
        setError(getFriendlyErrorMessage(err as any, 'Failed to regenerate'));
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }

  }, [lastAction, isLoading, currentOutfitIndex, outfitHistory, currentPoseIndex, currentBackground]);

  const canUndo = currentOutfitIndex > 0;
  const canRedo = currentOutfitIndex < outfitHistory.length - 1;
  const canRegenerate = currentOutfitIndex > 0 && !!lastAction;

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };

  return (
    <div className="font-sans">
      <AnimatePresence mode="wait">
        {!modelImageUrl ? (
          <motion.div
            key="start-screen"
            className="w-screen min-h-screen flex items-start sm:items-center justify-center p-4 pb-20 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <StartScreen 
              onModelFinalized={handleModelFinalized}
              hasSavedOutfit={hasSavedOutfit}
              onLoadOutfit={handleLoadOutfit}
            />
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            className="relative flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <main className="flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
                {/* Column 1: Editor Controls (Left on Desktop, Middle on Mobile) */}
                <div className="lg:w-1/4 flex-shrink-0 order-2 lg:order-1 flex flex-col gap-4">
                     <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/50 sticky top-4">
                         <h2 className="text-xl font-serif tracking-wider text-gray-800 border-b border-gray-400/50 pb-2 mb-6">Studio Controls</h2>
                         <EditorControls
                          onSelectPose={handlePoseSelect}
                          poseInstructions={POSE_INSTRUCTIONS}
                          currentPoseIndex={currentPoseIndex}
                          onBackgroundChange={handleBackgroundChange}
                          onImageEdit={handleImageEdit}
                          isLoading={isLoading}
                        />
                     </div>
                </div>

                {/* Column 2: Canvas (Top on Mobile, Center on Desktop) */}
                <div className="flex-grow order-1 lg:order-2 flex flex-col min-h-[500px]">
                     <div className="lg:sticky lg:top-4 z-10">
                        <Canvas 
                            displayImageUrl={displayImageUrl}
                            onStartOver={handleAttemptStartOver}
                            isLoading={isLoading}
                            loadingMessage={loadingMessage}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            onRegenerate={handleRegenerate}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            canRegenerate={canRegenerate}
                        />
                     </div>
                </div>

                {/* Column 3: Wardrobe & History (Bottom on Mobile, Right on Desktop) */}
                <div className="lg:w-1/4 flex-shrink-0 order-3 flex flex-col gap-4">
                     <div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-white/50 flex flex-col gap-8 h-fit">
                        {error && (
                          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                          </div>
                        )}
                        <OutfitStack 
                          outfitHistory={activeOutfitLayers}
                          onRemoveLastGarment={handleUndo}
                        />
                        <RecentCreations 
                            items={recentCreations} 
                            onView={(item) => {
                                window.open(item.url, '_blank');
                            }}
                        />
                        <WardrobePanel
                          onGarmentSelect={handleGarmentSelect}
                          activeGarmentIds={activeGarmentIds}
                          isLoading={isLoading}
                          wardrobe={wardrobe}
                        />
                     </div>
                </div>
            </main>
            
            {/* Start Over Confirmation Modal */}
            <AnimatePresence>
                {showStartOverModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-xl"
                        >
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangleIcon className="w-6 h-6 text-amber-600" />
                                </div>
                                <h2 className="text-2xl font-serif text-gray-800">Before you start over...</h2>
                                <p className="text-gray-600 mt-2">Would you like to download your recent creations? Starting over will clear your current session and this history.</p>
                            </div>
                            {recentCreations.length > 0 && (
                                <div className="px-6 pb-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-2 text-center">Your Last {recentCreations.length} Items</p>
                                    <div className="grid grid-cols-6 gap-2 bg-gray-100 p-2 rounded-lg">
                                        {recentCreations.slice(0, 6).map((item, i) => (
                                            <div key={i} className="aspect-square w-full h-full rounded-md bg-gray-200 overflow-hidden relative">
                                                {item.type === 'video' ? (
                                                    <>
                                                        <video src={item.url} className="w-full h-full object-cover opacity-80" muted />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <PlayIcon className="w-4 h-4 text-white drop-shadow-md" fill="currentColor" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <img src={item.url} className="w-full h-full object-cover" alt={`Creation ${i+1}`} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row-reverse gap-2 bg-gray-50 p-4 rounded-b-2xl">
                                <button
                                    onClick={() => { handleDownloadAll(); handleConfirmStartOver(); }}
                                    className="w-full sm:w-auto flex-1 inline-flex justify-center items-center px-4 py-2 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors"
                                >
                                    <DownloadIcon className="w-4 h-4 mr-2" />
                                    Download & Start Over
                                </button>
                                <button
                                    onClick={handleConfirmStartOver}
                                    className="w-full sm:w-auto flex-1 inline-flex justify-center px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 transition-colors"
                                >
                                    Start Over Anyway
                                </button>
                                <button
                                    onClick={handleCancelStartOver}
                                    className="w-full sm:w-auto mt-2 sm:mt-0 sm:flex-1 inline-flex justify-center px-4 py-2 bg-white text-gray-700 font-semibold rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
              {isLoading && isMobile && (
                <motion.div
                  className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
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
          </motion.div>
        )}
      </AnimatePresence>

       {/* Install App Button */}
       <AnimatePresence>
        {deferredPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-6 z-[100]"
          >
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-full shadow-xl hover:bg-gray-800 transition-colors font-semibold"
            >
              <SmartphoneIcon className="w-5 h-5" />
              <span>Install App</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer isOnDressingScreen={!!modelImageUrl} />
    </div>
  );
};

export default App;
