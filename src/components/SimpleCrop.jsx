import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Button from './Common/Button';
import Card from './Common/Card';
import { ArrowLeft, Printer, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

const SimpleCrop = ({ photos, onBack, onPrintTrigger }) => {
  const [crop1, setCrop1] = useState({ x: 0, y: 0 });
  const [zoom1, setZoom1] = useState(1);
  const [croppedAreaPixels1, setCroppedAreaPixels1] = useState(null);

  const [crop2, setCrop2] = useState({ x: 0, y: 0 });
  const [zoom2, setZoom2] = useState(1);
  const [croppedAreaPixels2, setCroppedAreaPixels2] = useState(null);

  const [isExporting, setIsExporting] = useState(false);

  const onCropComplete1 = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels1(croppedAreaPixels);
  }, []);

  const onCropComplete2 = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels2(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(URL.createObjectURL(blob));
      }, 'image/jpeg');
    });
  };

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

  const handlePrint = async () => {
    try {
      const cropped1 = await getCroppedImg(photos[0], croppedAreaPixels1);
      const cropped2 = await getCroppedImg(photos[1], croppedAreaPixels2);
      onPrintTrigger([cropped1, cropped2]);
    } catch (e) {
      console.error(e);
      alert('Error cropping images for print');
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const cropped1 = await getCroppedImg(photos[0], croppedAreaPixels1);
      const cropped2 = await getCroppedImg(photos[1], croppedAreaPixels2);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [101.6, 152.4] // 4x6 inches
      });

      const padding = 2.54; // 0.1in
      const gap = 2; // 2mm
      const photoW = 45;
      const photoH = 35;

      const base64Img1 = await getRotatedImageBase64(cropped1);
      const base64Img2 = await getRotatedImageBase64(cropped2);

      for (let i = 0; i < 8; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        
        const x = padding + col * (photoW + gap);
        const y = padding + row * (photoH + gap);
        
        const imgToDraw = i < 4 ? base64Img1 : base64Img2;
        
        pdf.addImage(imgToDraw, 'JPEG', x, y, photoW, photoH, undefined, 'FAST');
        
        pdf.setDrawColor(203, 213, 225);
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
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="text-slate-400">
          Back
        </Button>
        <h2 className="text-2xl font-bold text-white">Crop Photos (35x45mm ratio)</h2>
        <div className="flex gap-4">
          <Button 
            variant="secondary" 
            onClick={handleDownloadPDF} 
            icon={isExporting ? Loader2 : Download} 
            disabled={isExporting}
          >
            {isExporting ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button variant="primary" onClick={handlePrint} icon={Printer}>
            Direct Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cropper 1 */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-medium text-slate-300">
            Photo 1
          </div>
          <div className="relative w-full h-[400px] bg-slate-900">
            <Cropper
              image={photos[0]}
              crop={crop1}
              zoom={zoom1}
              aspect={35 / 45}
              onCropChange={setCrop1}
              onCropComplete={onCropComplete1}
              onZoomChange={setZoom1}
            />
          </div>
          <div className="p-4 bg-slate-950">
            <label className="text-xs text-slate-400 block mb-2">Zoom</label>
            <input
              type="range"
              value={zoom1}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom1(e.target.value)}
              className="w-full accent-blue-500"
            />
          </div>
        </Card>

        {/* Cropper 2 */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-medium text-slate-300">
            Photo 2
          </div>
          <div className="relative w-full h-[400px] bg-slate-900">
            <Cropper
              image={photos[1]}
              crop={crop2}
              zoom={zoom2}
              aspect={35 / 45}
              onCropChange={setCrop2}
              onCropComplete={onCropComplete2}
              onZoomChange={setZoom2}
            />
          </div>
          <div className="p-4 bg-slate-950">
            <label className="text-xs text-slate-400 block mb-2">Zoom</label>
            <input
              type="range"
              value={zoom2}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom2(e.target.value)}
              className="w-full accent-blue-500"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SimpleCrop;
