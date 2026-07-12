import React from 'react';
import Button from './Common/Button';
import { ArrowLeft, Printer } from 'lucide-react';

const SimplePrint = ({ croppedPhotos, onBack, onReset }) => {
  // We need exactly 8 photos total (4 of each)
  const printItems = [
    croppedPhotos[0], croppedPhotos[0], croppedPhotos[0], croppedPhotos[0],
    croppedPhotos[1], croppedPhotos[1], croppedPhotos[1], croppedPhotos[1]
  ];

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
