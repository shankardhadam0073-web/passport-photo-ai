import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { initFaceDetector, initImageSegmenter } from '../utils/detector';

const PhotoContext = createContext();

import { PASSPORT_SIZES, SHEET_SIZES } from '../constants';

let hasStartedPreloading = false;

export const PhotoProvider = ({ children }) => {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState([]); 
  const [historyVersion, setHistoryVersion] = useState(0);

  const triggerHistoryRefresh = useCallback(() => {
    setHistoryVersion((v) => v + 1);
  }, []);

  // Preload models in the background on mount
  useEffect(() => {
    if (hasStartedPreloading) return;
    hasStartedPreloading = true;

    const preload = async () => {
      try {
        await initFaceDetector();
        await initImageSegmenter();
      } catch (err) {
        console.warn('AI models background preload warning: ', err);
      }
    };
    preload();
  }, []);
  
  const getLocalItem = (key, defaultVal) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  // App preferences (Hardcoded)
  const [passportSize, setPassportSize] = useState(PASSPORT_SIZES.EU);
  const [sheetSize, setSheetSize] = useState(SHEET_SIZES.PHOTO_4X6);
  const [copies, setCopies] = useState(4);
  const [customSize, setCustomSize] = useState({ width: 35, height: 45 });
  
  const [includeCutLines, setIncludeCutLines] = useState(false);
  const [includePhotoBorder, setIncludePhotoBorder] = useState(false);
  const [defaultBackgroundColor, setDefaultBackgroundColor] = useState(() => getLocalItem('pref_backgroundColor', 'original'));

  // Save preferences (Only background color now)
  useEffect(() => localStorage.setItem('pref_backgroundColor', JSON.stringify(defaultBackgroundColor)), [defaultBackgroundColor]);
  
  // Face detection / Model states
  const [detectingFace, setDetectingFace] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);

  const addImage = useCallback((originalUrl, meta = {}) => {
    setImages((prev) => {
      if (prev.length >= 2) return prev;
      const newImage = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        original: originalUrl, // 1280px preview
        originalHires: meta.originalHires || originalUrl, // Blob URL
        fileSize: meta.fileSize || 0,
        resolution: meta.resolution || '',
        cropped: null,
        croppedPreview: null,
        crop: { x: 0, y: 0 },
        zoom: 1,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        exposure: 100,
        sharpness: 0,
        backgroundColor: defaultBackgroundColor,
        backgroundMask: null,
        croppedAreaPixels: null,
        faceDetected: false,
        faceError: null,
      };
      return [...prev, newImage];
    });
  }, [defaultBackgroundColor]);

  const removeImage = useCallback((id) => {
    setImages((prev) => {
      const img = prev.find(i => i.id === id);
      if (img && img.originalHires && img.originalHires.startsWith('blob:')) {
        URL.revokeObjectURL(img.originalHires);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const updateImageSettings = useCallback((id, settings) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...settings } : img))
    );
  }, []);

  const loadSession = useCallback((session) => {
    setImages(session.images || []);
    setPassportSize(PASSPORT_SIZES.EU);
    setSheetSize(SHEET_SIZES.PHOTO_4X6);
    setCopies(4);
    setStep(3); // Go straight to preview
  }, []);

  const resetAll = useCallback(() => {
    setImages((prev) => {
      prev.forEach(img => {
        if (img.originalHires && img.originalHires.startsWith('blob:')) {
          URL.revokeObjectURL(img.originalHires);
        }
      });
      return [];
    });
    setStep(1);
    setPassportSize(PASSPORT_SIZES.EU);
    setSheetSize(SHEET_SIZES.PHOTO_4X6);
    setCopies(4);
    setCustomSize({ width: 35, height: 45 });
    setDetectingFace(false);
    setIsModelLoading(false);
  }, []);

  const contextValue = useMemo(() => ({
    step,
    setStep,
    images,
    setImages,
    addImage,
    removeImage,
    updateImageSettings,
    passportSize,
    setPassportSize,
    sheetSize,
    setSheetSize,
    copies,
    setCopies,
    customSize,
    setCustomSize,
    includeCutLines,
    setIncludeCutLines,
    includePhotoBorder,
    setIncludePhotoBorder,
    defaultBackgroundColor,
    setDefaultBackgroundColor,
    detectingFace,
    setDetectingFace,
    isModelLoading,
    setIsModelLoading,
    resetAll,
    loadSession,
    historyVersion,
    triggerHistoryRefresh,
  }), [
    step,
    images,
    addImage,
    removeImage,
    updateImageSettings,
    passportSize,
    sheetSize,
    copies,
    customSize,
    includeCutLines,
    includePhotoBorder,
    defaultBackgroundColor,
    detectingFace,
    isModelLoading,
    resetAll,
    loadSession,
    historyVersion,
    triggerHistoryRefresh,
  ]);

  return (
    <PhotoContext.Provider value={contextValue}>
      {children}
    </PhotoContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePhoto = () => {
  const context = useContext(PhotoContext);
  if (!context) {
    throw new Error('usePhoto must be used within a PhotoProvider');
  }
  return context;
};
