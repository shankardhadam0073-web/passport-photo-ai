import React, { useState, useRef, useEffect, memo } from 'react';
import jsPDF from 'jspdf';
import { usePhoto } from '../context/PhotoContext';
import { SHEET_SIZES } from '../constants';
import { saveSession } from '../utils/db';
import { getCroppedImg } from '../utils/cropper';
import Card from './Common/Card';
import Button from './Common/Button';
import { 
  Download, 
  Printer, 
  ArrowLeft, 
  Check, 
  FileText, 
  Scissors, 
  Frame,
  LayoutGrid,
  Loader2,
  Copy,
  Info,
  FileImage,
  Save,
  Move
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const StepPreview = memo(() => {
  const {
    images,
    setStep,
    sheetSize,
    setSheetSize,
    passportSize,
    copies,
    setCopies,
    includeCutLines,
    setIncludeCutLines,
    includePhotoBorder,
    setIncludePhotoBorder,
    resetAll,
    triggerHistoryRefresh
  } = usePhoto();

  const [activeIdx, setActiveIdx] = useState(images.length > 1 ? 'combined' : 0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(''); // 'png' | 'pdf' | 'session'
  const [hasSaved, setHasSaved] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // offset in mm
  
  // Drag and drop state
  const [customPositions, setCustomPositions] = useState({}); // { [uniqueId]: { x: mm, y: mm } }
  const [dragState, setDragState] = useState({ id: null, startX: 0, startY: 0, initX: 0, initY: 0 });
  const sheetScaleRef = useRef(null);
  const sheetRef = useRef(null);
  const hiddenSheetsRef = useRef([]); // To hold refs to all sheets for session export
  const { addToast } = useToast();

  const activeImage = activeIdx === 'combined' ? images[0] : images[activeIdx];
  const activeImagesArray = activeIdx === 'combined' ? images : [activeImage];

  // Auto-switch to A4 size if 2 photos are present and the paper size is currently 4x6
  // Wait, since we are doing separate sheets now, 4x6 is fine! It will just make two 4x6 sheets.
  // The requirement says "Process both uploaded images independently. Each image should have its own Passport Sheet".

  useEffect(() => {
    // Automatically save session on first preview render if not saved
    if (!hasSaved && images.length > 0) {
      const sessionData = {
        images,
        passportSize,
        sheetSize,
        copies
      };
      saveSession(sessionData).then(() => {
        addToast('Session saved to history automatically.', 'success');
        setHasSaved(true);
        triggerHistoryRefresh();
      }).catch((e) => {
        console.error(e);
      });
    }
  }, [hasSaved, images, passportSize, sheetSize, copies, addToast, triggerHistoryRefresh]);

  const generateLayout = (imagesArray) => {
    const paper = { w: 101.6, h: 152.4, pad: 0 };
    const gapMm = 2;
    const photoW = 45; // 35x45 rotated 90 degrees
    const photoH = 35;
    
    let layoutImages = [];
    let cols = 2;
    let rows = 2;
    
    if (imagesArray.length === 1) {
      layoutImages = [imagesArray[0], imagesArray[0], imagesArray[0], imagesArray[0]];
      rows = 2;
    } else if (imagesArray.length >= 2) {
      layoutImages = [
        imagesArray[0], imagesArray[0], imagesArray[0], imagesArray[0],
        imagesArray[1], imagesArray[1], imagesArray[1], imagesArray[1]
      ];
      rows = 4;
    } else {
      return { paper, items: [], gridW: 0, gridH: 0 };
    }
    
    const gridW = cols * photoW + (cols - 1) * gapMm;
    const gridH = rows * photoH + (rows - 1) * gapMm;
    
    const startX = (paper.w - gridW) / 2;
    const startY = (paper.h - gridH) / 2;
    
    const items = layoutImages.map((img, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return {
        img,
        id: "sheet-$(${img?.id || i})-${i}",
        x: startX + c * (photoW + gapMm),
        y: startY + r * (photoH + gapMm),
        w: photoW,
        h: photoH,
        rotate: true
      };
    });
    
    return { paper, items, gridW, gridH };
  };

  const generateCanvasFromState = async () => {
    const layout = generateLayout(activeImagesArray);
    const DPI = 600;
    const pxPerMm = DPI / 25.4;
    
    const canvas = document.createElement('canvas');
    const canvasW = Math.round(layout.paper.w * pxPerMm);
    const canvasH = Math.round(layout.paper.h * pxPerMm);
    canvas.width = canvasW;
    canvas.height = canvasH;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const loadedImages = {};
    for (const item of layout.items) {
      if (!loadedImages[item.img.id]) {
        loadedImages[item.img.id] = await new Promise((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = item.img.croppedPreview;
        });
      }
    }
    
    for (const item of layout.items) {
      const htmlImage = loadedImages[item.img.id];
      const xPx = Math.round(item.x * pxPerMm);
      const yPx = Math.round(item.y * pxPerMm);
      const wPx = Math.round(item.w * pxPerMm);
      const hPx = Math.round(item.h * pxPerMm);
      
      if (htmlImage) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(xPx, yPx, wPx, hPx);
        ctx.save();
        ctx.translate(xPx + wPx / 2, yPx + hPx / 2);
        if (item.rotate) {
          ctx.rotate((90 * Math.PI) / 180);
          let sW = htmlImage.width;
          let sH = htmlImage.height;
          const imgR = sW / sH;
          const tR = hPx / wPx; 
          let sx = 0, sy = 0;
          if (imgR > tR) {
            sW = sH * tR;
            sx = (htmlImage.width - sW) / 2;
          } else {
            sH = sW / tR;
            sy = (htmlImage.height - sH) / 2;
          }
          ctx.drawImage(htmlImage, sx, sy, sW, sH, -hPx / 2, -wPx / 2, hPx, wPx);
        }
        ctx.restore();
      }
      
      if (includePhotoBorder) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(1, Math.round(1 * (DPI / 96)));
        ctx.strokeRect(xPx, yPx, wPx, hPx);
      }
    }
    
    const fontSizePx = Math.round(8 * (DPI / 96));
    ctx.font = "$fontSizePx px monospace";
    ctx.fillStyle = '#94a3b8';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    
    const textMarginXPx = Math.round(16 * (DPI / 96));
    const textMarginYPx = Math.round(12 * (DPI / 96));
    ctx.fillText('AI PASSPORT PHOTO COPIES', textMarginXPx, textMarginYPx);
    ctx.textAlign = 'right';
    ctx.fillText('SCALE: 100%', canvasW - textMarginXPx, textMarginYPx);
    
    return canvas;
  };

  const renderSheetContent = () => {
    const layout = generateLayout(activeImagesArray);

    return (
      <div className="w-full h-full relative box-border overflow-hidden">
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}>
          {layout.items.map((item, idx) => (
            <div
              key={item.id + idx}
              style={{ 
                position: 'absolute',
                left: "$(${item.x})mm",
                top: "$(${item.y})mm",
                width: "$(${item.w})mm", 
                height: "$(${item.h})mm",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                ...(includePhotoBorder ? { border: '1px solid #cbd5e1' } : {})
              }}
            >
              {includeCutLines && (
                <div style={{ position: 'absolute', top: '-6px', left: '-6px', right: '-6px', bottom: '-6px', border: '1px dashed rgba(203, 213, 225, 0.6)', pointerEvents: 'none' }} />
              )}
              {item.img?.croppedPreview ? (
                <img 
                  src={item.img.croppedPreview} 
                  alt="Passport Cutout" 
                  style={item.rotate ? {
                    width: "$(${item.h})mm",
                    height: "$(${item.w})mm",
                    transform: 'rotate(90deg)',
                    transformOrigin: 'center',
                    objectFit: 'cover'
                  } : {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '500' }}>No Image</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!activeImage) return null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Export Loader Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <Card className="max-w-md w-full text-center flex flex-col items-center p-8 border border-blue-500/20">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
            <h3 className="text-xl font-bold font-display text-white mb-2">Generating High-Res Export</h3>
            <p className="text-slate-300 text-sm mb-1">
              Rendering {exportType === 'session' ? 'multi-page PDF' : (exportType === 'png' ? 'HD PNG image' : 'Print PDF')}...
            </p>
            <p className="text-slate-500 text-xs">This will download automatically when finished.</p>
          </Card>
        </div>
      )}

      {/* Tabs removed as per requirement */}

      {/* Main Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start no-print">
        
        {/* Left Side: Interactive Preview Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center gap-6 print:block print:w-full">
          <h3 className="text-lg font-bold font-display text-white self-start no-print">
            Print Sheet Preview ({activeIdx === 'combined' ? 'All Photos Combined' : `Photo #${activeIdx + 1}`})
          </h3>
          
          <div className="w-full overflow-x-auto flex justify-center py-6 bg-slate-950/40 rounded-2xl border border-slate-800/80 relative print:bg-white print:border-none print:py-0 print:overflow-visible">
            <div className="origin-top scale-[0.6] sm:scale-[0.8] lg:scale-[0.7] xl:scale-[0.8] my-4 shadow-2xl print:scale-100 print:my-0 print:shadow-none print:origin-top-left">
              
              <div
                style={{
                  width: currentSheet.width,
                  height: currentSheet.height,
                }}
                className="relative box-border select-none bg-white"
              >
                <div className="no-print" style={{ 
                  color: '#94a3b8', borderBottom: '1px solid #f1f5f9',
                  position: 'absolute', top: '12px', left: '16px', right: '16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '8px', fontFamily: 'monospace', textTransform: 'uppercase', paddingBottom: '4px'
                }}>
                  <span>AI Passport Photo Copies Generator</span>
                  <span>Scale: 100% (Actual Size)</span>
                </div>

                {renderSheetContent(activeImagesArray)}

                <div className="no-print" style={{ 
                  color: '#94a3b8', borderTop: '1px solid #f1f5f9',
                  position: 'absolute', bottom: '12px', left: '16px', right: '16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '8px', fontFamily: 'monospace', paddingTop: '4px'
                }}>
                  <span>Standard: {passportSize.name}</span>
                  <span>Paper: {currentSheet.title}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-slate-400 text-xs text-center flex items-center gap-1.5 bg-slate-900/40 py-2.5 px-4 rounded-xl border border-slate-800/50">
            <Scissors className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Note: Dashed lines represent cutting guides. Print at <b>100% scale (disable fit-to-page)</b>.</span>
          </div>
        </div>

        {/* Right Side: Action Panel & Configurations */}
        <div className="lg:col-span-5 flex flex-col gap-6 no-print">
          
          {/* Photo Details */}
          <Card className="flex flex-col gap-4">
            <h4 className="text-slate-300 text-sm font-semibold flex items-center gap-2 border-b border-slate-800 pb-2">
              <Info className="w-4 h-4 text-blue-400" />
              Photo Details
            </h4>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Face Detected</span>
                <span className="text-slate-300">{activeIdx === 'combined' ? 'Multiple' : (activeImage.faceDetected ? 'Yes' : 'No')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Selected Size</span>
                <span className="text-slate-300">{passportSize.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Copies</span>
                <span className="text-slate-300">{copies} per photo</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Paper Size</span>
                <span className="text-slate-300">{currentSheet.title}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Image Res</span>
                <span className="text-slate-300 font-mono">{activeImage.resolution || 'N/A'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">File Size</span>
                <span className="text-slate-300 font-mono">{(activeImage.fileSize / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-6">
            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                onClick={handlePrint}
                icon={Printer}
                className="w-full py-3"
              >
                Print Photo Directly
              </Button>
            </div>

            {/* Go Back / Reset */}
            <div className="border-t border-slate-800 pt-5 flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                icon={ArrowLeft}
                className="flex-1 py-2 text-slate-400 hover:text-slate-200"
              >
                Adjust Crop
              </Button>
              <Button
                variant="ghost"
                onClick={resetAll}
                className="flex-1 py-2 text-rose-500 hover:bg-rose-500/10"
              >
                Create New
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Hidden nodes removed */}

      {/* DIRECT PRINT VIEW & EXPORT LAYOUT (Unified) */}
      <div className="absolute top-[-10000px] left-[-10000px] print:static print:block print-area">
        <div
          ref={sheetRef}
          style={{
            width: currentSheet.width,
            height: currentSheet.height,
            backgroundColor: 'white',
            color: 'black',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
          className="safe-export"
        >
          <div style={{ 
            color: '#94a3b8', borderBottom: '1px solid #f1f5f9',
            position: 'absolute', top: '12px', left: '16px', right: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '8px', fontFamily: 'monospace', paddingBottom: '4px'
          }}>
            <span>AI Passport Photo Copies</span>
            <span>Scale: 100%</span>
          </div>
          {renderSheetContent(activeImagesArray)}
          <div style={{ 
            color: '#94a3b8', borderTop: '1px solid #f1f5f9',
            position: 'absolute', bottom: '12px', left: '16px', right: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '8px', fontFamily: 'monospace', paddingTop: '4px'
          }}>
            <span>Standard: {passportSize.name}</span>
            <span>Paper: {currentSheet.title}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default StepPreview;
