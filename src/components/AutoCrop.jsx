import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { 
  RefreshCw,
  Check,
  Sparkles,
  SlidersHorizontal,
  Palette,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import Button from './Common/Button';
import { applySharpen } from '../utils/cropper';
import { segmentBackground } from '../utils/detector';
import { useToast } from '../context/ToastContext';

const AutoCrop = memo(({
  imageSrc,
  settings,
  onUpdateSettings,
  croppedAreaPixels,
  canvasRef,
  onReset,
  onApply,
  isApplied,
  passportSize,
  faceData
}) => {
  const imageRef = useRef(null);
  const maskRef = useRef(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const { addToast } = useToast();

  const {
    rotation = 0,
    brightness = 100,
    contrast = 100,
    saturation = 100,
    exposure = 100,
    sharpness = 0,
    backgroundColor = 'original',
    backgroundMask = null
  } = settings;

  // Helper for rotating sizes
  const rotateSize = (width, height, rotDeg) => {
    const rotRad = (rotDeg * Math.PI) / 180;
    return {
      width:
        Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotDeg * Math.PI / 180) * height),
      height:
        Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotDeg * Math.PI / 180) * height),
    };
  };

  const drawCanvas = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !croppedAreaPixels) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y, width, height } = croppedAreaPixels;
    
    // Set internal canvas pixel dimensions matching aspect ratio
    canvas.width = 400;
    canvas.height = Math.round(400 / passportSize.aspect);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply brightness, contrast, saturation, exposure
    const finalBrightness = (brightness * exposure) / 100;
    ctx.filter = `brightness(${finalBrightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    if (rotation === 0) {
      ctx.drawImage(img, x, y, width, height, 0, 0, canvas.width, canvas.height);
    } else {
      const rotRad = (rotation * Math.PI) / 180;
      const { width: bBoxWidth, height: bBoxHeight } = rotateSize(img.width, img.height, rotation);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = bBoxWidth;
      tempCanvas.height = bBoxHeight;
      const tempCtx = tempCanvas.getContext('2d');

      tempCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
      tempCtx.rotate(rotRad);
      tempCtx.translate(-img.width / 2, -img.height / 2);
      tempCtx.drawImage(img, 0, 0);

      ctx.drawImage(tempCanvas, x, y, width, height, 0, 0, canvas.width, canvas.height);
    }

    ctx.filter = 'none';

    if (sharpness > 0) {
      applySharpen(ctx, canvas.width, canvas.height, sharpness / 100);
    }

    if (maskRef.current && backgroundColor !== 'original') {
      const mCanvas = document.createElement('canvas');
      const bBox = rotateSize(img.width, img.height, rotation);
      mCanvas.width = bBox.width;
      mCanvas.height = bBox.height;
      const mCtx = mCanvas.getContext('2d');
      mCtx.translate(bBox.width / 2, bBox.height / 2);
      mCtx.rotate((rotation * Math.PI) / 180);
      mCtx.translate(-img.width / 2, -img.height / 2);
      mCtx.drawImage(maskRef.current, 0, 0);

      const maskData = mCtx.getImageData(x, y, width, height);

      // Create a temporary canvas at native crop resolution to draw maskData
      const tempMaskCanvas = document.createElement('canvas');
      tempMaskCanvas.width = width;
      tempMaskCanvas.height = height;
      const tempMaskCtx = tempMaskCanvas.getContext('2d');
      tempMaskCtx.putImageData(maskData, 0, 0);

      const mCropCanvas = document.createElement('canvas');
      mCropCanvas.width = canvas.width;
      mCropCanvas.height = canvas.height;
      const mCropCtx = mCropCanvas.getContext('2d');
      // Scale and draw the mask using drawImage
      mCropCtx.drawImage(tempMaskCanvas, 0, 0, canvas.width, canvas.height);

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      const finalCtx = finalCanvas.getContext('2d');

      finalCtx.fillStyle = backgroundColor;
      finalCtx.fillRect(0, 0, canvas.width, canvas.height);

      mCropCtx.globalCompositeOperation = 'source-in';
      mCropCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

      finalCtx.drawImage(mCropCanvas, 0, 0, canvas.width, canvas.height);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(finalCanvas, 0, 0);
    }
  }, [croppedAreaPixels, passportSize.aspect, brightness, exposure, contrast, saturation, rotation, sharpness, backgroundColor, canvasRef]);

  // Load mask if available
  useEffect(() => {
    if (backgroundMask) {
      const img = new Image();
      img.src = backgroundMask;
      img.onload = () => {
        maskRef.current = img;
        drawCanvas();
      };
    } else {
      maskRef.current = null;
      drawCanvas();
    }
  }, [backgroundMask, drawCanvas]);

  // Redraw canvas whenever settings or image coordinates shift
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [imageSrc, drawCanvas]);

  const handleBackgroundColor = async (color) => {
    if (color !== 'original' && !backgroundMask) {
      setIsSegmenting(true);
      try {
        const maskUrl = await segmentBackground(imageSrc);
        if (maskUrl) {
          onUpdateSettings({ backgroundMask: maskUrl, backgroundColor: color });
          addToast('AI Background removed successfully!', 'success');
        } else {
          addToast('Failed to segment background.', 'error');
        }
      } catch (err) {
        console.error(err);
        addToast('Error generating AI background.', 'error');
      } finally {
        setIsSegmenting(false);
      }
    } else {
      onUpdateSettings({ backgroundColor: color });
    }
  };

  const updateSetting = (key, value) => {
    onUpdateSettings({ [key]: value });
  };

  let faceHeightMm = 0;
  let isValidFaceSize = false;
  let facePercentage = 0;

  if (faceData && croppedAreaPixels) {
    const faceRatio = faceData.boundingBox.height / croppedAreaPixels.height;
    faceHeightMm = faceRatio * passportSize.height;
    facePercentage = Math.round(faceRatio * 100);
    // Passport standard: Face should be 70% to 80% of photo height.
    isValidFaceSize = facePercentage >= 70 && facePercentage <= 80;
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* 1. Canvas Cropped Preview */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-355 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          Cropped Passport Preview
        </h3>
        
        <div className="relative w-full max-w-[200px] mx-auto pt-4 pl-4">
          <div 
            className="relative w-full border border-slate-800 bg-slate-950 rounded-xl shadow-lg flex items-center justify-center"
            style={{ aspectRatio: passportSize.aspect }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover rounded-xl"
            />
            {/* Ruler Top */}
            <div className="absolute bottom-full left-0 right-0 h-4 bg-slate-900 border-b border-slate-800 flex items-end justify-between px-1.5 pb-0.5 text-[8px] text-slate-500 z-10 font-mono rounded-t-lg">
              <span>0mm</span>
              <span>{Math.round(passportSize.width)}mm</span>
            </div>
            {/* Ruler Left */}
            <div className="absolute right-full top-0 bottom-0 w-4 bg-slate-900 border-r border-slate-800 flex flex-col items-center justify-between py-1.5 pr-0.5 text-[8px] text-slate-500 z-10 font-mono rounded-l-lg" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
              <span>{Math.round(passportSize.height)}mm</span>
              <span>0mm</span>
            </div>
            {/* Overlay Cut Guides */}
            <div className="absolute inset-1.5 border border-dashed border-white/20 pointer-events-none rounded-lg" />
          </div>
        </div>

        {/* Validation Warning */}
        {faceData && (
          <div className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
            isValidFaceSize ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' : 'bg-amber-950/30 border-amber-900/50 text-amber-400'
          }`}>
            <div className="flex items-center gap-2">
              <Check className={`w-4 h-4 ${isValidFaceSize ? 'text-emerald-500' : 'text-amber-500 opacity-50'}`} />
              <span className="font-semibold">Face Size: {facePercentage}% ({faceHeightMm.toFixed(1)} mm)</span>
            </div>
            {isValidFaceSize ? (
              <span className="font-bold">Perfect</span>
            ) : (
              <span className="font-bold">Aim for 70-80%</span>
            )}
          </div>
        )}
      </div>

      {/* 2. Color Refinements */}
      <div className="border-t border-slate-800 pt-4">
        <h4 className="text-slate-300 text-xs font-semibold mb-3 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          Color Adjustments
        </h4>
        
        <div className="flex flex-col gap-3">
          {/* Background Replacement */}
          <div className="mb-2">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <Palette className="w-3 h-3" />
                Background Replacement
              </span>
              {isSegmenting && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
            </div>
            <div className="flex items-center gap-2">
              {[
                { id: 'original', label: 'Original', color: 'transparent' },
                { id: '#ffffff', label: 'White', color: '#ffffff' },
                { id: '#e0f2fe', label: 'Blue', color: '#e0f2fe' },
                { id: '#f1f5f9', label: 'Grey', color: '#f1f5f9' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => handleBackgroundColor(bg.id)}
                  disabled={isSegmenting}
                  className={`relative flex-1 h-8 rounded-lg border flex items-center justify-center transition-all ${
                    backgroundColor === bg.id
                      ? 'border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)]'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                  style={{ backgroundColor: bg.id === 'original' ? '#1e293b' : bg.color }}
                  title={bg.label}
                >
                  {bg.id === 'original' && <ImageIcon className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Brightness */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>Brightness</span>
                <span className="font-mono">{brightness}%</span>
              </div>
              <input type="range" min="50" max="150" value={brightness} onChange={(e) => updateSetting('brightness', parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500" />
            </div>
            {/* Contrast */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>Contrast</span>
                <span className="font-mono">{contrast}%</span>
              </div>
              <input type="range" min="50" max="150" value={contrast} onChange={(e) => updateSetting('contrast', parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500" />
            </div>
            {/* Saturation */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>Saturation</span>
                <span className="font-mono">{saturation}%</span>
              </div>
              <input type="range" min="0" max="200" value={saturation} onChange={(e) => updateSetting('saturation', parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500" />
            </div>
            {/* Exposure */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>Exposure</span>
                <span className="font-mono">{exposure}%</span>
              </div>
              <input type="range" min="50" max="150" value={exposure} onChange={(e) => updateSetting('exposure', parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500" />
            </div>
            {/* Sharpness */}
            <div className="col-span-2">
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>Sharpness</span>
                <span className="font-mono">{sharpness}%</span>
              </div>
              <input type="range" min="0" max="100" value={sharpness} onChange={(e) => updateSetting('sharpness', parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Crop Apply & Reset Control Panel */}
      <div className="border-t border-slate-800 pt-4 flex gap-2">
        <Button
          variant="secondary"
          onClick={onReset}
          icon={RefreshCw}
          className="flex-1 py-2 text-xs"
        >
          Reset AI
        </Button>
        <Button
          variant={isApplied ? "success" : "primary"}
          onClick={onApply}
          icon={isApplied ? Check : Check}
          className="flex-1 py-2 text-xs font-semibold"
        >
          {isApplied ? "Crop Saved!" : "Apply Crop"}
        </Button>
      </div>
    </div>
  );
});

export default AutoCrop;
