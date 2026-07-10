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

  // App preferences
  const [passportSize, setPassportSize] = useState(() => getLocalItem('pref_passportSize', PASSPORT_SIZES.US));
  const [sheetSize, setSheetSize] = useState(() => getLocalItem('pref_sheetSize', SHEET_SIZES.PHOTO_4X6));
  const [copies, setCopies] = useState(() => getLocalItem('pref_copies', 4));
  const [customSize, setCustomSize] = useState(() => getLocalItem('pref_customSize', { width: 35, height: 45 }));
  
  const [includeCutLines, setIncludeCutLines] = useState(() => getLocalItem('pref_cutLines', true));
  const [includePhotoBorder, setIncludePhotoBorder] = useState(() => getLocalItem('pref_photoBorder', true));
  const [defaultBackgroundColor, setDefaultBackgroundColor] = useState(() => getLocalItem('pref_backgroundColor', 'original'));

  // Save preferences
  useEffect(() => localStorage.setItem('pref_passportSize', JSON.stringify(passportSize)), [passportSize]);
  useEffect(() => localStorage.setItem('pref_sheetSize', JSON.stringify(sheetSize)), [sheetSize]);
  useEffect(() => localStorage.setItem('pref_copies', JSON.stringify(copies)), [copies]);
  useEffect(() => localStorage.setItem('pref_customSize', JSON.stringify(customSize)), [customSize]);
  useEffect(() => localStorage.setItem('pref_cutLines', JSON.stringify(includeCutLines)), [includeCutLines]);
  useEffect(() => localStorage.setItem('pref_photoBorder', JSON.stringify(includePhotoBorder)), [includePhotoBorder]);
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
    setPassportSize(session.passportSize || PASSPORT_SIZES.US);
    setSheetSize(session.sheetSize || SHEET_SIZES.A4);
    setCopies(session.copies || 4);
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
    setPassportSize(PASSPORT_SIZES.US);
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
