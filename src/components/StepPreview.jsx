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

  const generateCanvasFromState = async (flattenedImages) => {
    const paper = getDimensionsMm(sheetSize.id);
    const photo = getDimensionsMm(passportSize.id);
    const gapMm = sheetSize.id === 'PHOTO_4X6' ? 2 : 4;
    
    const activeLayout = calculateMaxCopies();
    const { cols, rotatePhoto } = activeLayout;
    
    const DPI = 600;
    const pxPerMm = DPI / 25.4;
    
    const canvas = document.createElement('canvas');
    const canvasW = Math.round(paper.w * pxPerMm);
    const canvasH = Math.round(paper.h * pxPerMm);
    canvas.width = canvasW;
    canvas.height = canvasH;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const loadedImages = {};
    for (const img of flattenedImages) {
      if (!loadedImages[img.id]) {
        loadedImages[img.id] = await new Promise((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = img.croppedPreview;
        });
      }
    }
    
    const photoW = rotatePhoto ? photo.h : photo.w;
    const photoH = rotatePhoto ? photo.w : photo.h;
    
    const actualCols = Math.min(cols, flattenedImages.length);
    const activeRows = Math.ceil(flattenedImages.length / cols);
    const actualRows = Math.min(activeLayout.rows, activeRows);
    const gridWMm = actualCols * photoW + (Math.max(1, actualCols) - 1) * gapMm;
    const gridHMm = actualRows * photoH + (Math.max(1, actualRows) - 1) * gapMm;
    

    
    const cutLineWidth = Math.max(1, Math.round(1 * (DPI / 96))); 
    const borderLineWidth = Math.max(1, Math.round(1 * (DPI / 96))); 
    const cutOffsetPx = 1.5 * pxPerMm;
    
    const printableW = paper.w - (2 * paper.pad);
    const printableH = paper.h - (2 * paper.pad);
    const startXMm = (printableW - gridWMm) / 2;
    const startYMm = (printableH - gridHMm) / 2;

    for (let i = 0; i < flattenedImages.length; i++) {
        const imgData = flattenedImages[i];
        const uniqueId = `sheet-${imgData.id}-${i}`;
        const htmlImage = loadedImages[imgData.id];
        
        let xMm = 0;
        let yMm = 0;
        
        if (customPositions[uniqueId]) {
          xMm = customPositions[uniqueId].x;
          yMm = customPositions[uniqueId].y;
        } else {
          const r = Math.floor(i / cols);
          const c = i % cols;
          xMm = startXMm + c * (photoW + gapMm);
          yMm = startYMm + r * (photoH + gapMm);
        }
        
        // Convert to paper coordinates by adding padding and global offset
        const finalXMm = xMm + paper.pad + offset.x;
        const finalYMm = yMm + paper.pad + offset.y;
        
        const xPx = Math.round(finalXMm * pxPerMm);
        const yPx = Math.round(finalYMm * pxPerMm);
        const wPx = Math.round(photoW * pxPerMm);
        const hPx = Math.round(photoH * pxPerMm);
        

        
        if (htmlImage) {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(xPx, yPx, wPx, hPx);
          
          ctx.save();
          ctx.translate(xPx + wPx / 2, yPx + hPx / 2);
          
          if (rotatePhoto) {
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
          } else {
            let sW = htmlImage.width;
            let sH = htmlImage.height;
            const imgR = sW / sH;
            const tR = wPx / hPx;
            let sx = 0, sy = 0;
            if (imgR > tR) {
              sW = sH * tR;
              sx = (htmlImage.width - sW) / 2;
            } else {
              sH = sW / tR;
              sy = (htmlImage.height - sH) / 2;
            }
            ctx.drawImage(htmlImage, sx, sy, sW, sH, -wPx / 2, -hPx / 2, wPx, hPx);
          }
          ctx.restore();
        }
        
        if (includePhotoBorder) {
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = borderLineWidth;
          ctx.strokeRect(xPx, yPx, wPx, hPx);
        }
        
        if (includeCutLines) {
          ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
          ctx.lineWidth = cutLineWidth;
          ctx.setLineDash([15 * (DPI/96), 15 * (DPI/96)]);
          ctx.strokeRect(xPx - cutOffsetPx, yPx - cutOffsetPx, wPx + 2 * cutOffsetPx, hPx + 2 * cutOffsetPx);
          ctx.setLineDash([]);
        }
    }
    
    const fontSizePx = Math.round(8 * (DPI / 96));
    ctx.font = `${fontSizePx}px monospace`;
    ctx.fillStyle = '#94a3b8';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = Math.max(1, Math.round(1 * (DPI / 96)));
    
    const textMarginXPx = Math.round(16 * (DPI / 96));
    const textMarginYPx = Math.round(12 * (DPI / 96));
    
    ctx.beginPath();
    ctx.moveTo(textMarginXPx, textMarginYPx + fontSizePx + textMarginYPx);
    ctx.lineTo(canvasW - textMarginXPx, textMarginYPx + fontSizePx + textMarginYPx);
    ctx.stroke();
    
    ctx.textAlign = 'left';
    ctx.fillText('AI PASSPORT PHOTO COPIES', textMarginXPx, textMarginYPx);
    ctx.textAlign = 'right';
    ctx.fillText('SCALE: 100%', canvasW - textMarginXPx, textMarginYPx);
    
    ctx.beginPath();
    ctx.moveTo(textMarginXPx, canvasH - textMarginYPx - fontSizePx - textMarginYPx);
    ctx.lineTo(canvasW - textMarginXPx, canvasH - textMarginYPx - fontSizePx - textMarginYPx);
    ctx.stroke();
    
    ctx.textAlign = 'left';
    ctx.fillText(`Standard: ${passportSize.name}`, textMarginXPx, canvasH - textMarginYPx - fontSizePx);
    ctx.textAlign = 'right';
    ctx.fillText(`Paper: ${sheetSize.name}`, canvasW - textMarginXPx, canvasH - textMarginYPx - fontSizePx);
    
    return canvas;
  };

  const handleDownloadPNG = async () => {
    setIsExporting(true);
    setExportType('png');
    try {
      await new Promise(r => setTimeout(r, 100)); 
      const flattenedImages = [];
      for (const img of activeImagesArray) {
        for (let i = 0; i < copies; i++) flattenedImages.push(img);
      }
      const canvas = await generateCanvasFromState(flattenedImages);
      const pngDataUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = "passport-photo-sheet.png";
      link.href = pngDataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
      addToast(`Could not generate PNG: ${err.message || 'Unknown error'}. Please try again.`, 'error');
    } finally {
      setIsExporting(false);
      setExportType('');
    }
  };

  const getPdfFormat = () => {
    if (sheetSize.id === 'PHOTO_4X6') {
      return { format: [101.6, 152.4], unit: 'mm', pdfWidth: 101.6, pdfHeight: 152.4 };
    } else if (sheetSize.id === 'LETTER') {
      return { format: [215.9, 279.4], unit: 'mm', pdfWidth: 215.9, pdfHeight: 279.4 };
    }
    return { format: 'a4', unit: 'mm', pdfWidth: 210, pdfHeight: 297 };
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    setExportType('pdf');
    try {
      await new Promise(r => setTimeout(r, 100)); 
      const flattenedImages = [];
      for (const img of activeImagesArray) {
        for (let i = 0; i < copies; i++) flattenedImages.push(img);
      }
      const canvas = await generateCanvasFromState(flattenedImages);
      const pngDataUrl = canvas.toDataURL("image/png", 1.0);
      const { format, unit, pdfWidth, pdfHeight } = getPdfFormat();
      const pdf = new jsPDF({ orientation: "portrait", unit, format, compress: true });
      pdf.addImage(pngDataUrl, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      pdf.save("passport-photo-sheet.pdf");
    } catch (err) {
      console.error('Error generating PDF:', err);
      addToast(`Could not generate PDF: ${err.message || 'Unknown error'}. Please try again.`, 'error');
    } finally {
      setIsExporting(false);
      setExportType('');
    }
  };

  const handleDownloadSessionPDF = async () => {
    if (images.length === 0) return;
    setIsExporting(true);
    setExportType('session');
    try {
      await new Promise(r => setTimeout(r, 100)); 
      const { format, unit, pdfWidth, pdfHeight } = getPdfFormat();
      const pdf = new jsPDF({ orientation: 'portrait', unit, format, compress: true });
      
      const flattenedImages = [];
      for (const img of images) {
        for (let i = 0; i < copies; i++) {
          flattenedImages.push(img);
        }
      }
      
      const maxPerSheet = calculateMaxCopies().max;
      const totalSheets = Math.ceil(flattenedImages.length / maxPerSheet);
      
      for (let s = 0; s < totalSheets; s++) {
        const sheetImages = flattenedImages.slice(s * maxPerSheet, (s + 1) * maxPerSheet);
        const canvas = await generateCanvasFromState(sheetImages);
        const pngDataUrl = canvas.toDataURL("image/png", 1.0);
        
        if (s > 0) pdf.addPage();
        pdf.addImage(pngDataUrl, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }
      
      if (totalSheets === 0) throw new Error("No pages could be rendered");
      pdf.save("passport-photo-session.pdf");
    } catch (err) {
      console.error('Error generating Session PDF:', err);
      addToast(`Could not generate Session PDF: ${err.message || 'Unknown error'}. Please try again.`, 'error');
    } finally {
      setIsExporting(false);
      setExportType('');
    }
  };

  // Direct print (Uses browser print dialog, will print all visible print-area nodes)
  const handlePrint = () => {
    window.print();
  };

  const sheetStyles = {
    PHOTO_4X6: { width: '4in', height: '6in', padding: '0.25in', title: '4" x 6" Photo Paper' },
    A4: { width: '210mm', height: '297mm', padding: '15mm', title: 'A4 Document Paper' },
    LETTER: { width: '8.5in', height: '11in', padding: '0.75in', title: 'Letter Document Paper' }
  };

  const photoStyles = {
    US: { width: '2in', height: '2in' },
    EU: { width: '35mm', height: '45mm' },
    CA: { width: '50mm', height: '70mm' },
    CN: { width: '33mm', height: '48mm' }
  };

  const currentSheet = sheetStyles[sheetSize.id];
  const currentPhoto = photoStyles[passportSize.id] || { width: `${passportSize.width}mm`, height: `${passportSize.height}mm` };

  // Calculate maximum copies that fit on the selected paper
  const getDimensionsMm = (id) => {
    switch (id) {
      case 'PHOTO_4X6': return { w: 101.6, h: 152.4, pad: 3 }; // 3mm borderless margin for photo paper
      case 'A4': return { w: 210, h: 297, pad: 8 }; // 8mm print margin
      case 'LETTER': return { w: 215.9, h: 279.4, pad: 8 }; // 8mm print margin
      case 'US': return { w: 50.8, h: 50.8 };
      case 'EU': return { w: 35, h: 45 };
      case 'CA': return { w: 50, h: 70 };
      case 'CN': return { w: 33, h: 48 };
      case 'VISA': return { w: 51, h: 51 };
      // Fallback for custom or unknown sizes, assuming 2x2 inches default
      default: return { 
        w: passportSize.width || 50.8, 
        h: passportSize.height || 50.8,
        pad: 0 
      };
    }
  };

  const calculateMaxCopies = () => {
    const paper = getDimensionsMm(sheetSize.id);
    const photo = getDimensionsMm(passportSize.id);
    const gapMm = sheetSize.id === 'PHOTO_4X6' ? 2 : 4; // Approx CSS gap

    const printableW = paper.w - (2 * paper.pad);
    const printableH = paper.h - (2 * paper.pad);

    // Option A: Normal/Portrait orientation
    const colsA = Math.floor((printableW + gapMm) / (photo.w + gapMm));
    const rowsA = Math.floor((printableH + gapMm) / (photo.h + gapMm));
    const copiesA = Math.max(1, colsA * rowsA);

    // Option B: Swapped/Landscape orientation (rotate photos 90 deg to fit more)
    const colsB = Math.floor((printableW + gapMm) / (photo.h + gapMm));
    const rowsB = Math.floor((printableH + gapMm) / (photo.w + gapMm));
    const copiesB = Math.max(1, colsB * rowsB);

    // Choose the orientation that yields maximum copies
    if (copiesB > copiesA) {
      return {
        max: copiesB,
        cols: colsB,
        rows: rowsB,
        rotatePhoto: true
      };
    } else {
      return {
        max: copiesA,
        cols: colsA,
        rows: rowsA,
        rotatePhoto: false
      };
    }
  };

  const layoutInfo = calculateMaxCopies();
  const baseMaxCopies = layoutInfo.max;
  const maxCopies = activeIdx === 'combined' ? Math.floor(baseMaxCopies / images.length) : baseMaxCopies;

  // Clamp copies to max possible whenever paper size or passport size layout details change
  useEffect(() => {
    if (copies > maxCopies || copies === 0) {
      setCopies(maxCopies > 0 ? maxCopies : 1);
    }
  }, [maxCopies, copies, setCopies]);

  const paper = getDimensionsMm(sheetSize.id);
  const photo = getDimensionsMm(passportSize.id);
  const gapMm = sheetSize.id === 'PHOTO_4X6' ? 2 : 4;
  const { cols, rotatePhoto } = layoutInfo;
  
  const photoW = rotatePhoto ? photo.h : photo.w;
  const photoH = rotatePhoto ? photo.w : photo.h;
  
  const totalPhotos = activeImagesArray.length * copies;
  const actualCols = Math.min(cols, totalPhotos);
  const activeRows = Math.ceil(totalPhotos / cols);
  const actualRows = Math.min(layoutInfo.rows, activeRows);
  const gridW = actualCols * photoW + (Math.max(1, actualCols) - 1) * gapMm;
  const gridH = actualRows * photoH + (Math.max(1, actualRows) - 1) * gapMm;

  const printableW = paper.w - (2 * paper.pad);
  const printableH = paper.h - (2 * paper.pad);

  // Maximum shift limits in mm
  const maxX = Math.max(0, (printableW - gridW) / 2);
  const minX = -maxX;
  const maxY = Math.max(0, (printableH - gridH) / 2);
  const minY = -maxY;

  // Reset offset when sheet size changes
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [sheetSize.id]);

  // Clamp current offset when layout constraints change
  useEffect(() => {
    setOffset(prev => ({
      x: Math.max(minX, Math.min(maxX, prev.x)),
      y: Math.max(minY, Math.min(maxY, prev.y))
    }));
  }, [minX, maxX, minY, maxY]);

  // Reset custom dragged positions when layout changes significantly
  useEffect(() => {
    setCustomPositions({});
  }, [sheetSize.id, passportSize.id, images.length, copies, activeIdx]);

  const handlePointerDown = (e, uniqueId, currentXMm, currentYMm) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    setDragState({
      id: uniqueId,
      startX: e.clientX,
      startY: e.clientY,
      initX: currentXMm,
      initY: currentYMm
    });
  };

  const handlePointerMove = (e) => {
    if (dragState.id) {
      const container = sheetScaleRef.current;
      const scale = container ? container.getBoundingClientRect().width / container.offsetWidth : 1;
      const pxToMm = (25.4 / 96) / scale;
      
      const dx = (e.clientX - dragState.startX) * pxToMm;
      const dy = (e.clientY - dragState.startY) * pxToMm;
      
      setCustomPositions(prev => ({
        ...prev,
        [dragState.id]: {
          x: dragState.initX + dx,
          y: dragState.initY + dy
        }
      }));
    }
  };

  const handlePointerUp = (e) => {
    if (dragState.id) {
      try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
      setDragState({ id: null, startX: 0, startY: 0, initX: 0, initY: 0 });
    }
  };

  const renderPhoto = (imgSrc, key, rotate, xMm, yMm) => {
    const isDraggingThis = dragState.id === key;
    return (
      <div
        key={key}
        onPointerDown={(e) => handlePointerDown(e, key, xMm, yMm)}
        style={{ 
          position: 'absolute',
          left: `${xMm}mm`,
          top: `${yMm}mm`,
          width: rotate ? currentPhoto.height : currentPhoto.width, 
          height: rotate ? currentPhoto.width : currentPhoto.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: isDraggingThis ? 'grabbing' : 'grab',
          zIndex: isDraggingThis ? 50 : 10,
          boxShadow: isDraggingThis ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)' : 'none',
          ...(includePhotoBorder ? { border: '1px solid #cbd5e1' } : {})
        }}
        className={`transition-shadow duration-200 touch-none`}
      >
      {includeCutLines && (
        <div style={{ position: 'absolute', top: '-6px', left: '-6px', right: '-6px', bottom: '-6px', border: '1px dashed rgba(203, 213, 225, 0.6)', pointerEvents: 'none' }} />
      )}
      {imgSrc ? (
        <img 
          src={imgSrc} 
          alt="Passport Cutout" 
          style={rotate ? {
            width: currentPhoto.width,
            height: currentPhoto.height,
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
    );
  };

  const renderSheetContent = (imagesToRender) => {
    // Scale gap automatically based on paper size
    const gapSize = sheetSize.id === 'PHOTO_4X6' ? '8px' : '16px';
    const { cols, rotatePhoto } = layoutInfo;

    const flattenedImages = [];
    for (const img of imagesToRender) {
      for (let i = 0; i < copies; i++) flattenedImages.push(img);
    }

    const startXMm = (printableW - gridW) / 2;
    const startYMm = (printableH - gridH) / 2;

    return (
      <div 
        className="w-full h-full relative box-border overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        ref={sheetScaleRef}
      >
        <div 
          style={{ 
            position: 'absolute',
            left: `${paper.pad}mm`,
            top: `${paper.pad}mm`,
            width: `calc(100% - ${2 * paper.pad}mm)`,
            height: `calc(100% - ${2 * paper.pad}mm)`,
            transform: `translate(${offset.x}mm, ${offset.y}mm)`,
            transition: dragState.id ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          {flattenedImages.map((img, idx) => {
            const uniqueId = `sheet-${img.id}-${idx}`;
            let xMm = 0;
            let yMm = 0;
            if (customPositions[uniqueId]) {
              xMm = customPositions[uniqueId].x;
              yMm = customPositions[uniqueId].y;
            } else {
              const r = Math.floor(idx / cols);
              const c = idx % cols;
              xMm = startXMm + c * (photoW + gapMm);
              yMm = startYMm + r * (photoH + gapMm);
            }
            return renderPhoto(img.croppedPreview, uniqueId, rotatePhoto, xMm, yMm);
          })}
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

      {/* Tabs if 2 images uploaded */}
      {images.length > 1 && (
        <div className="flex justify-center mb-6 no-print">
          <div className="inline-flex p-1 bg-slate-900/60 rounded-xl border border-slate-800">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveIdx(idx)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  activeIdx === idx
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileImage className="w-4 h-4" />
                Photo #{idx + 1} Sheet
              </button>
            ))}
            <button
              onClick={() => setActiveIdx('combined')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeIdx === 'combined'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Combined Sheet
            </button>
          </div>
        </div>
      )}

      {/* Main Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
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
            {/* Paper Size Selector */}
            <div>
              <label className="text-slate-355 text-xs font-bold tracking-wider uppercase mb-3 block flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-blue-400" />
                Select Paper Sheet Layout
              </label>
              <div className="flex flex-col gap-2">
                {Object.values(SHEET_SIZES).map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSheetSize(size)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 text-left ${
                      sheetSize.id === size.id
                        ? 'border-blue-500 bg-blue-600/10 text-white'
                        : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200 cursor-pointer'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-semibold block">{size.name}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Units: {size.displayWidth} x {size.displayHeight} {size.unit}
                      </span>
                    </div>
                    {sheetSize.id === size.id && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies Selector */}
            <div className="border-t border-slate-800 pt-5">
              <label className="text-slate-355 text-xs font-bold tracking-wider uppercase mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Copy className="w-4 h-4 text-blue-400" /> Number of Copies</span>
                <span className="text-slate-500 font-mono">Max: {maxCopies}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 4, 6, 8, 12, 16].map((num) => {
                  const isDisabled = num > maxCopies;
                  return (
                    <button
                      key={num}
                      onClick={() => setCopies(num)}
                      disabled={isDisabled}
                      className={`p-2.5 rounded-xl border transition-all text-sm font-semibold ${
                        isDisabled
                          ? 'border-slate-800 bg-slate-900/10 text-slate-700 cursor-not-allowed'
                          : copies === num
                          ? 'border-blue-500 bg-blue-600/10 text-white'
                          : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
                {/* Max Fill Button */}
                {![2, 4, 6, 8, 12, 16].includes(maxCopies) && maxCopies > 0 && (
                  <button
                    onClick={() => setCopies(maxCopies)}
                    className={`col-span-3 p-2.5 rounded-xl border transition-all text-sm font-semibold flex items-center justify-center gap-2 ${
                      copies === maxCopies
                        ? 'border-blue-500 bg-blue-600/10 text-white'
                        : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Fill Page ({maxCopies})
                  </button>
                )}
              </div>
            </div>

            {/* Print Sheet Offset Controls */}
            <div className="border-t border-slate-800 pt-5">
              <label className="text-slate-355 text-xs font-bold tracking-wider uppercase mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-blue-400" /> Print Sheet Offset
                </span>
                <span className="text-slate-500 font-mono">
                  X: {offset.x > 0 ? `+${offset.x}` : offset.x} mm, Y: {offset.y > 0 ? `+${offset.y}` : offset.y} mm
                </span>
              </label>
              
              <div className="flex flex-col items-center gap-3">
                <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
                  {/* Row 1 */}
                  <div></div>
                  <button
                    onClick={() => setOffset(prev => ({ ...prev, y: Math.max(minY, prev.y - 2) }))}
                    disabled={offset.y <= minY}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                    title="Move Up"
                  >
                    ▲
                  </button>
                  <div></div>

                  {/* Row 2 */}
                  <button
                    onClick={() => setOffset(prev => ({ ...prev, x: Math.max(minX, prev.x - 2) }))}
                    disabled={offset.x <= minX}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                    title="Move Left"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => setOffset({ x: 0, y: 0 })}
                    className="p-3 rounded-xl border border-blue-500/20 bg-blue-600/10 text-blue-400 hover:border-blue-500 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                    title="Center Layout"
                  >
                    Center
                  </button>
                  <button
                    onClick={() => setOffset(prev => ({ ...prev, x: Math.min(maxX, prev.x + 2) }))}
                    disabled={offset.x >= maxX}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                    title="Move Right"
                  >
                    ▶
                  </button>

                  {/* Row 3 */}
                  <div></div>
                  <button
                    onClick={() => setOffset(prev => ({ ...prev, y: Math.min(maxY, prev.y + 2) }))}
                    disabled={offset.y >= maxY}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                    title="Move Down"
                  >
                    ▼
                  </button>
                  <div></div>
                </div>
                
                <span className="text-[11px] text-slate-500 text-center block">
                  Move in 2 mm steps to align grid for reusing cut paper. Clamped to safe printable limits.
                </span>
              </div>
            </div>

            {/* Toggles */}
            <div className="border-t border-slate-800 pt-5">
              <h4 className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
                <Frame className="w-4 h-4 text-blue-400" />
                Sheet Guide Preferences
              </h4>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/20 border border-slate-850 hover:bg-slate-900/40 transition-colors cursor-pointer select-none">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200">Include Cut Guides</span>
                    <span className="text-xs text-slate-500">Adds dashed borders around photos for easy cutting</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCutLines}
                    onChange={(e) => setIncludeCutLines(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-850 border-slate-750 rounded focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/20 border border-slate-850 hover:bg-slate-900/40 transition-colors cursor-pointer select-none">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200">Outline Photo Border</span>
                    <span className="text-xs text-slate-500">Adds a thin border directly on photo boundaries</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includePhotoBorder}
                    onChange={(e) => setIncludePhotoBorder(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-850 border-slate-750 rounded focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-800 pt-6 flex flex-col gap-3">
              {images.length > 1 && (
                <Button
                  variant="primary"
                  onClick={handleDownloadSessionPDF}
                  icon={Save}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                >
                  Export Entire Session as PDF
                </Button>
              )}
              <Button
                variant={images.length > 1 ? "secondary" : "primary"}
                onClick={handlePrint}
                icon={Printer}
                className="w-full py-3"
              >
                Print Current Photo Directly
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={handleDownloadPNG}
                  icon={Download}
                >
                  Download PNG
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDownloadPDF}
                  icon={FileText}
                >
                  Download PDF
                </Button>
              </div>
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

      {/* Hidden nodes for generating multi-page PDF of all sessions invisibly */}
      <div className="absolute top-[-10000px] left-[-10000px] pointer-events-none">
        {images.map((img, idx) => (
          <div
            key={`hidden-${img.id}`}
            ref={(el) => hiddenSheetsRef.current[idx] = el}
            style={{ width: currentSheet.width, height: currentSheet.height }}
            className="safe-export relative flex flex-col justify-center items-center box-border"
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
            {renderSheetContent([img])}
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
        ))}
      </div>

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
