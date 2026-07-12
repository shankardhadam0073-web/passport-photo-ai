import React from 'react';

const PrintLayout = ({ croppedPhotos }) => {
  if (!croppedPhotos || !croppedPhotos[0] || !croppedPhotos[1]) return null;

  const printItems = [
    croppedPhotos[0], croppedPhotos[0], croppedPhotos[0], croppedPhotos[0],
    croppedPhotos[1], croppedPhotos[1], croppedPhotos[1], croppedPhotos[1]
  ];

  return (
    <div className="w-full flex items-center justify-center p-8 bg-slate-50/50 print:p-0 print:bg-transparent min-h-screen print:min-h-0">
      <div 
        className="print-container bg-white shadow-2xl shadow-slate-900/10 rounded-xl print:shadow-none print:rounded-none"
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
    </div>
  );
};

export default PrintLayout;
