import React, { useState, useRef, useCallback, useMemo } from 'react';
import Cropper from 'react-easy-crop';
import { usePhoto } from '../context/PhotoContext';
import { PASSPORT_SIZES } from '../constants';
import { useToast } from '../context/ToastContext';
import FaceDetector from './FaceDetector';
import AutoCrop from './AutoCrop';
import Card from './Common/Card';
import Button from './Common/Button';
import { calculatePassportCrop } from '../utils/detector';
import { getCroppedImg, createImage } from '../utils/cropper';
import { 
  ArrowLeft, 
  ArrowRight,
  Loader2,
  FileImage,
  RotateCw,
  Sparkles,
  Maximize,
  ZoomIn
} from 'lucide-react';

const StepCrop = () => {
  const { addToast } = useToast();
  const {
    images,
    setImages,
    updateImageSettings,
    setStep,
    passportSize,
    setPassportSize,
    customSize,
    setCustomSize,
    detectingFace,
    setDetectingFace
  } = usePhoto();

  const [activeIdx, setActiveIdx] = useState(0);
  const [aiCropSettingsMap, setAiCropSettingsMap] = useState({}); // Stores initial AI crops for Reset trigger
  const [isAppliedMap, setIsAppliedMap] = useState({}); // Tracks if Apply Crop has been clicked for each photo
  const [faceDataMap, setFaceDataMap] = useState({}); // Stores face scanning metadata
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef(null);
  const activeImage = useMemo(() => images[activeIdx], [images, activeIdx]);

  // Update the passport size when user selects preset
  const handlePassportSizeChange = useCallback((presetId) => {
    if (presetId === 'CUSTOM') {
      setPassportSize({
        ...PASSPORT_SIZES.CUSTOM,
        width: customSize.width,
        height: customSize.height,
        aspect: customSize.width / customSize.height
      });
    } else {
      setPassportSize(PASSPORT_SIZES[presetId]);
    }
  }, [customSize, setPassportSize]);

  // Handle custom size input change
  const handleCustomSizeChange = useCallback((dimension, value) => {
    const val = parseFloat(value) || 1;
    const newCustomSize = { ...customSize, [dimension]: val };
    setCustomSize(newCustomSize);
    
    if (passportSize.id === 'CUSTOM') {
      setPassportSize({
        ...PASSPORT_SIZES.CUSTOM,
        width: newCustomSize.width,
        height: newCustomSize.height,
        aspect: newCustomSize.width / newCustomSize.height
      });
    }
  }, [customSize, passportSize.id, setCustomSize, setPassportSize]);

  // Callback when AI face detection highlights a face
  const handleFaceDetected = useCallback((faceData) => {
    if (!activeImage?.id) return;
    setFaceDataMap((prev) => ({ ...prev, [activeImage.id]: faceData }));
    
    // Calculate initial AI crop alignment
    const aiSettings = calculatePassportCrop(faceData, passportSize.aspect);
    
    // Keep a cache of these settings for the Reset button
    setAiCropSettingsMap((prev) => ({ ...prev, [activeImage.id]: aiSettings }));

    // Apply the coordinates directly to current crop session
    updateImageSettings(activeImage.id, {
      crop: aiSettings.crop,
      zoom: aiSettings.zoom,
      rotation: 0,
      croppedAreaPixels: aiSettings.pixelCrop,
      faceDetected: true,
      faceError: null
    });
  }, [activeImage?.id, passportSize.aspect, updateImageSettings]);

  const handleNoFaceDetected = useCallback((errorMsg) => {
    if (!activeImage?.id) return;
    updateImageSettings(activeImage.id, {
      faceDetected: false,
      faceError: errorMsg,
      crop: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0
    });
  }, [activeImage?.id, updateImageSettings]);

  const handleUpdateSettings = useCallback((newSettings) => {
    if (!activeImage?.id) return;
    updateImageSettings(activeImage.id, newSettings);
    // Mark as unsaved if user alters filters/settings
    if (isAppliedMap[activeImage.id]) {
      setIsAppliedMap((prev) => ({ ...prev, [activeImage.id]: false }));
    }
  }, [activeImage?.id, isAppliedMap, updateImageSettings]);

  // Handles updates from the react-easy-crop window
  const handleCropChange = useCallback((cropVal) => {
    if (!activeImage?.id) return;
    updateImageSettings(activeImage.id, { crop: cropVal });
    if (isAppliedMap[activeImage.id]) {
      setIsAppliedMap((prev) => ({ ...prev, [activeImage.id]: false }));
    }
  }, [activeImage?.id, isAppliedMap, updateImageSettings]);

  const handleZoomChange = useCallback((zoomVal) => {
    if (!activeImage?.id) return;
    updateImageSettings(activeImage.id, { zoom: parseFloat(zoomVal) });
    if (isAppliedMap[activeImage.id]) {
      setIsAppliedMap((prev) => ({ ...prev, [activeImage.id]: false }));
    }
  }, [activeImage?.id, isAppliedMap, updateImageSettings]);

  const handleRotationChange = useCallback((rotVal) => {
    if (!activeImage?.id) return;
    updateImageSettings(activeImage.id, { rotation: parseInt(rotVal) });
    if (isAppliedMap[activeImage.id]) {
      setIsAppliedMap((prev) => ({ ...prev, [activeImage.id]: false }));
    }
  }, [activeImage?.id, isAppliedMap, updateImageSettings]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixelsVal) => {
    if (activeImage) {
      updateImageSettings(activeImage.id, { croppedAreaPixels: croppedAreaPixelsVal });
    }
  }, [activeImage, updateImageSettings]);

  // Reset to original AI auto-cropped coordinates
  const handleResetToAI = useCallback(() => {
    if (!activeImage) return;
    const aiSettings = aiCropSettingsMap[activeImage.id];
    if (aiSettings) {
      updateImageSettings(activeImage.id, {
        crop: aiSettings.crop,
        zoom: aiSettings.zoom,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        exposure: 100,
        sharpness: 0,
        backgroundColor: 'original',
        croppedAreaPixels: aiSettings.pixelCrop
      });
    } else {
      // Centered fallback if no face detected
      updateImageSettings(activeImage.id, {
        crop: { x: 0, y: 0 },
        zoom: 1,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        exposure: 100,
        sharpness: 0,
        backgroundColor: 'original',
        croppedAreaPixels: {
          x: 0,
          y: 0,
          width: 400,
          height: Math.round(400 / passportSize.aspect)
        }
      });
    }
    setIsAppliedMap((prev) => ({ ...prev, [activeImage.id]: false }));
  }, [activeImage, aiCropSettingsMap, passportSize.aspect, updateImageSettings]);

  // Apply crop: Render canvas data URL and lock it
  const handleApplyCrop = useCallback(() => {
    if (canvasRef.current && activeImage) {
      const croppedDataUrl = canvasRef.current.toDataURL('image/png');
      updateImageSettings(activeImage.id, { croppedPreview: croppedDataUrl });
      setIsAppliedMap((prev) => ({ ...prev, [activeImage.id]: true }));
    }
  }, [activeImage, updateImageSettings]);

  // Move between tabs
  const handleTabChange = useCallback((idx) => {
    if (canvasRef.current && activeImage) {
      const croppedDataUrl = canvasRef.current.toDataURL('image/png');
      updateImageSettings(activeImage.id, { croppedPreview: croppedDataUrl });
    }
    setActiveIdx(idx);
  }, [activeImage, updateImageSettings]);

  // Proceed to Step 3 sheet generator
  const handleProceed = useCallback(async () => {
    setIsProcessing(true);
    try {
      if (canvasRef.current && activeImage) {
        const croppedDataUrl = canvasRef.current.toDataURL('image/png');
        updateImageSettings(activeImage.id, { croppedPreview: croppedDataUrl });
        setIsAppliedMap((prev) => ({ ...prev, [activeImage.id]: true }));
        activeImage.croppedPreview = croppedDataUrl;
      }

      const finalImages = await Promise.all(
        images.map(async (img) => {
          if (img.croppedPreview) return img;

          const defaultCrop = {
            x: 0,
            y: 0,
            width: 400,
            height: Math.round(400 / passportSize.aspect)
          };

          let targetSrc = img.original;
          let targetCrop = img.croppedAreaPixels || defaultCrop;
          
          if (img.originalHires) {
             const origHtml = await createImage(img.original);
             const hiresHtml = await createImage(img.originalHires);
             const scale = hiresHtml.width / origHtml.width;
             targetSrc = img.originalHires;
             targetCrop = {
                x: Math.round(targetCrop.x * scale),
                y: Math.round(targetCrop.y * scale),
                width: Math.round(targetCrop.width * scale),
                height: Math.round(targetCrop.height * scale)
             };
          }

          const croppedUrl = await getCroppedImg(
            targetSrc,
            targetCrop,
            img.rotation,
            img.brightness,
            img.contrast,
            img.saturation,
            img.exposure,
            img.sharpness,
            img.backgroundColor,
            img.backgroundMask
          );

          return { ...img, croppedPreview: croppedUrl };
        })
      );

      setImages(finalImages);
      setStep(3);
    } catch (err) {
      console.error('Error proceeding: ', err);
      addToast('Could not compile crops. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [activeImage, images, passportSize.aspect, setImages, setStep, updateImageSettings, addToast]);

  if (!activeImage) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* AI Scanning Modal */}
      {detectingFace && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <Card className="max-w-md w-full text-center flex flex-col items-center p-8 border border-blue-500/20">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <h3 className="text-xl font-bold font-display text-white mb-2">Running Smart Face Crop</h3>
            <p className="text-slate-300 text-sm mb-1">Scanning face for specifications...</p>
            <p className="text-slate-500 text-xs">This takes only a few seconds...</p>
          </Card>
        </div>
      )}

      {/* Tabs if 2 images uploaded */}
      {images.length > 1 && (
        <div className="flex justify-center mb-6 no-print">
          <div className="inline-flex p-1 bg-slate-900/60 rounded-xl border border-slate-800">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => handleTabChange(idx)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  activeIdx === idx
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileImage className="w-4 h-4" />
                Adjust Photo #{idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor Main Grid workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Crop Editor using react-easy-crop (6/12 width) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Size Selector */}
          <Card className="p-4 flex flex-col gap-3 border border-slate-800 bg-slate-900/50">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Maximize className="w-4 h-4 text-blue-400" />
              Passport Photo Size
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
               {Object.values(PASSPORT_SIZES).map(size => (
                 <button 
                   key={size.id}
                   onClick={() => handlePassportSizeChange(size.id)}
                   className={`p-2 rounded-lg text-[10px] sm:text-xs font-semibold text-center transition-all ${
                     passportSize.id === size.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                   }`}
                 >
                   {size.label}
                 </button>
               ))}
            </div>
            {passportSize.id === 'CUSTOM' && (
              <div className="flex items-center gap-4 mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Width (mm)</label>
                  <input type="number" min="10" max="200" value={customSize.width} onChange={(e) => handleCustomSizeChange('width', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Height (mm)</label>
                  <input type="number" min="10" max="200" value={customSize.height} onChange={(e) => handleCustomSizeChange('height', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
            )}
          </Card>

          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mt-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Interactive Crop Editor #{activeIdx + 1}
          </h3>

          <Card className="p-0 overflow-hidden relative aspect-square w-full border border-slate-800 bg-slate-950 rounded-2xl">
            <div className="absolute inset-0">
              <Cropper
                image={activeImage.original}
                crop={activeImage.crop}
                zoom={activeImage.zoom}
                rotation={activeImage.rotation}
                aspect={passportSize.aspect}
                onCropChange={handleCropChange}
                onZoomChange={handleZoomChange}
                onRotationChange={handleRotationChange}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: { background: '#030712' },
                  cropAreaStyle: {
                    border: '2px solid #3b82f6',
                    boxShadow: '0 0 0 9999px rgba(3, 7, 18, 0.75)',
                    borderRadius: '4px'
                  }
                }}
              />
            </div>
          </Card>

          {/* Quick Sliders below editor */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <div className="flex justify-between items-center text-xs text-slate-450 mb-1">
                <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom</span>
                <span className="font-mono text-slate-300">{activeImage.zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={activeImage.zoom}
                onChange={(e) => handleZoomChange(e.target.value)}
                className="w-full h-1 bg-slate-850 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <div className="flex justify-between items-center text-xs text-slate-455 mb-1">
                <span className="flex items-center gap-1"><RotateCw className="w-3 h-3" /> Rotation</span>
                <span className="font-mono text-slate-300">{activeImage.rotation}°</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={activeImage.rotation}
                onChange={(e) => handleRotationChange(e.target.value)}
                className="w-full h-1 bg-slate-855 rounded appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Original view (FaceDetector) & Crop canvas preview (AutoCrop) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Top Panel: Static Original Image highlight box */}
          <Card className="p-5">
            <FaceDetector
              imageSrc={activeImage.original}
              onFaceDetected={handleFaceDetected}
              onNoFaceDetected={handleNoFaceDetected}
              detecting={detectingFace}
              setDetecting={setDetectingFace}
              faceDetected={activeImage.faceDetected}
              faceError={activeImage.faceError}
            />
          </Card>

          {/* Bottom Panel: Live Preview & adjustments */}
          <Card className="p-5 flex flex-col gap-4">
            <AutoCrop
              imageSrc={activeImage.original}
              settings={activeImage}
              onUpdateSettings={handleUpdateSettings}
              croppedAreaPixels={activeImage.croppedAreaPixels}
              canvasRef={canvasRef}
              onReset={handleResetToAI}
              onApply={handleApplyCrop}
              isApplied={isAppliedMap[activeImage.id] || false}
              passportSize={passportSize}
              faceData={faceDataMap[activeImage.id]}
            />

            {/* Step navigation actions */}
            <div className="border-t border-slate-800 pt-5 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep(1)}
                icon={ArrowLeft}
                className="flex-1 py-2.5"
                disabled={isProcessing}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleProceed}
                icon={isProcessing ? Loader2 : ArrowRight}
                className="flex-1 py-2.5"
                disabled={isProcessing || detectingFace}
              >
                {isProcessing ? 'Generating...' : 'Next: Sheet'}
              </Button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default StepCrop;
