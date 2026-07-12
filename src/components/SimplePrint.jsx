import React, { useState } from 'react';
import Button from './Common/Button';
import { ArrowLeft, Printer, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

const SimplePrint = ({ croppedPhotos, onBack, onReset }) => {
  // We need exactly 8 photos total (4 of each)
  const printItems = [
    croppedPhotos[0], croppedPhotos[0], croppedPhotos[0], croppedPhotos[0],
    croppedPhotos[1], croppedPhotos[1], croppedPhotos[1], croppedPhotos[1]
  ];
  
  const [isExporting, setIsExporting] = useState(false);

  const getRotatedImageBase64 = async (src) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    const canvas = document.createElement('canvas');
    canvas.width = img.height;
    canvas.height = img.width;
    const ctx = canvas.getContext('2d');
    
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    
    return canvas.toDataURL('image/jpeg', 1.0);
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [101.6, 152.4] // 4x6 inches
      });

      const padding = 2.54; // 0.1in
      const gap = 2; // 2mm
      const photoW = 45;
      const photoH = 35;

      const base64Img1 = await getRotatedImageBase64(croppedPhotos[0]);
      const base64Img2 = await getRotatedImageBase64(croppedPhotos[1]);

      for (let i = 0; i < 8; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        
        const x = padding + col * (photoW + gap);
        const y = padding + row * (photoH + gap);
        
        const imgToDraw = i < 4 ? base64Img1 : base64Img2;
        
        pdf.addImage(imgToDraw, 'JPEG', x, y, photoW, photoH, undefined, 'FAST');
        
        // Draw cut lines (optional, but requested for the UI, let's keep it clean on PDF or add dashed lines)
        pdf.setDrawColor(203, 213, 225); // #cbd5e1
        pdf.setLineDashPattern([1, 1], 0);
        pdf.setLineWidth(0.2);
        pdf.rect(x, y, photoW, photoH);
      }

      pdf.save('passport-photos-4x6.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen py-8">
      
      {/* Action Buttons (Hidden when printing) */}
      <div className="no-print flex gap-4 mb-8 w-full max-w-4xl px-4">
        <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="text-slate-400">
          Back to Crop
        </Button>
        <div className="flex-1"></div>
        <Button variant="ghost" onClick={onReset} className="text-rose-400">
          Start Over
        </Button>
        <Button 
          variant="secondary" 
          onClick={handleDownloadPDF} 
          icon={isExporting ? Loader2 : Download} 
          disabled={isExporting}
          className="px-6"
        >
          {isExporting ? 'Generating...' : 'Download PDF'}
        </Button>
        <Button variant="primary" onClick={() => window.print()} icon={Printer} className="px-8">
          Print
        </Button>
      </div>

      {/* 
        Print Canvas
        We use actual physical units (in, mm) to ensure it prints accurately.
        4x6 inches = 101.6mm x 152.4mm
        We rotate the 35x45mm photos by 90deg so they are 45x35mm,
        forming a 2x4 grid.
      */}
      <div 
        className="print-container bg-white shadow-2xl print:shadow-none"
        style={{
          width: '4in',
          height: '6in',
          padding: '0.1in',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: '2mm',
          alignItems: 'center',
          justifyItems: 'center'
        }}
      >
        {printItems.map((src, index) => (
          <div 
            key={index} 
            style={{
              width: '45mm', // Swapped for landscape orientation
              height: '35mm',
              border: '1px dashed #cbd5e1', // Cut lines
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <img 
              src={src} 
              alt={`Copy ${index}`}
              style={{
                width: '35mm',
                height: '45mm',
                transform: 'rotate(90deg)',
                objectFit: 'cover'
              }}
            />
          </div>
        ))}
      </div>
      
      <div className="no-print text-slate-500 text-sm mt-8 max-w-lg text-center">
        Ensure your printer settings are set to exactly <strong>4x6 Photo Paper</strong> and scale is set to <strong>100% / Actual Size</strong>.
      </div>
    </div>
  );
};

export default SimplePrint;
