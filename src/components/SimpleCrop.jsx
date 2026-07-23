import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import Button from './Common/Button';
import Card from './Common/Card';
import { Loader2, Download, Printer, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import { removeBackground } from '@imgly/background-removal';

const SimpleCrop = ({ photos, onBack, onPrintTrigger }) => {
  const [displayPhotos, setDisplayPhotos] = useState([...photos]);
  
  const [crop1, setCrop1] = useState({ x: 0, y: 0 });
  const [zoom1, setZoom1] = useState(1);
  const [croppedAreaPixels1, setCroppedAreaPixels1] = useState(null);
  const [bg1, setBg1] = useState('original');
  const [isProcessing1, setIsProcessing1] = useState(false);

  const [crop2, setCrop2] = useState({ x: 0, y: 0 });
  const [zoom2, setZoom2] = useState(1);
  const [croppedAreaPixels2, setCroppedAreaPixels2] = useState(null);
  const [bg2, setBg2] = useState('original');
  const [isProcessing2, setIsProcessing2] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  // Cache for transparent images so we don't re-run the AI model
  const [transparentImg1, setTransparentImg1] = useState(null);
  const [transparentImg2, setTransparentImg2] = useState(null);

  // Background Processing logic
  const handleBgChange = async (index, bgColor) => {
    if (index === 0) {
      setBg1(bgColor);
      if (bgColor === 'original') {
        const newPhotos = [...displayPhotos];
        newPhotos[0] = photos[0];
        setDisplayPhotos(newPhotos);
        return;
      }
      setIsProcessing1(true);
    } else {
      setBg2(bgColor);
      if (bgColor === 'original') {
        const newPhotos = [...displayPhotos];
        newPhotos[1] = photos[1];
        setDisplayPhotos(newPhotos);
        return;
      }
      setIsProcessing2(true);
    }

    try {
      let transparentUrl = index === 0 ? transparentImg1 : transparentImg2;

      if (!transparentUrl) {
        const imageSrc = photos[index];
        const config = {
          model: "small",
          publicPath: "https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/dist/"
        };
        const blob = await removeBackground(imageSrc, config);
        transparentUrl = URL.createObjectURL(blob);
        
        if (index === 0) setTransparentImg1(transparentUrl);
        else setTransparentImg2(transparentUrl);
      }
      
      const img = new Image();
      img.src = transparentUrl;
      await new Promise(r => img.onload = r);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (bgColor === 'white') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (bgColor === 'blue') {
        try {
          const bgImg = new Image();
          bgImg.src = '/passport_blue_bg.png';
          await new Promise((resolve, reject) => {
            bgImg.onload = resolve;
            bgImg.onerror = reject;
          });
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        } catch (err) {
          console.error("Failed to load custom blue background, falling back to solid color:", err);
          ctx.fillStyle = '#60A5FA';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      ctx.drawImage(img, 0, 0);
      
      const newUrl = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(URL.createObjectURL(b)), 'image/jpeg', 0.95);
      });

      const newPhotos = [...displayPhotos];
      newPhotos[index] = newUrl;
      setDisplayPhotos(newPhotos);
    } catch (e) {
      console.error("Background removal failed:", e);
      alert("Failed to remove background. Please try again.");
      if (index === 0) setBg1('original');
      else setBg2('original');
    } finally {
      if (index === 0) setIsProcessing1(false);
      else setIsProcessing2(false);
    }
  };

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
      const cropped1 = await getCroppedImg(displayPhotos[0], croppedAreaPixels1);
      const cropped2 = await getCroppedImg(displayPhotos[1], croppedAreaPixels2);
      onPrintTrigger([cropped1, cropped2]);
    } catch (e) {
      console.error(e);
      alert('Error cropping images for print');
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const cropped1 = await getCroppedImg(displayPhotos[0], croppedAreaPixels1);
      const cropped2 = await getCroppedImg(displayPhotos[1], croppedAreaPixels2);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="text-slate-500 px-2 md:px-5">
            Back
          </Button>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Crop Photos (35x45mm)</h2>
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <Button 
            variant="secondary" 
            onClick={handleDownloadPDF} 
            icon={isExporting ? Loader2 : Download} 
            disabled={isExporting || isProcessing1 || isProcessing2}
            className="w-full sm:w-auto py-3 md:py-2.5"
          >
            {isExporting ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button 
            variant="success" 
            onClick={handlePrint} 
            icon={Printer} 
            disabled={isProcessing1 || isProcessing2}
            className="w-full sm:w-auto py-4 md:py-3 text-lg font-bold shadow-lg shadow-emerald-600/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-600/40 hover:scale-105 transition-all duration-300"
          >
            Direct Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cropper 1 */}
        <Card className="flex flex-col overflow-hidden bg-white shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-100 font-medium text-slate-700 bg-slate-50 flex justify-between items-center">
            <span>Photo 1</span>
            <div className="flex bg-slate-200 rounded-lg p-1">
              <button 
                onClick={() => handleBgChange(0, 'original')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bg1 === 'original' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >Original</button>
              <button 
                onClick={() => handleBgChange(0, 'white')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bg1 === 'white' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >White</button>
              <button 
                onClick={() => handleBgChange(0, 'blue')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bg1 === 'blue' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >Blue</button>
            </div>
          </div>
          <div className="relative w-full h-[400px] bg-slate-100">
            {isProcessing1 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 z-10">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <span className="text-sm text-slate-600 font-medium">Removing Background...</span>
              </div>
            ) : null}
            <Cropper
              image={displayPhotos[0]}
              crop={crop1}
              zoom={zoom1}
              aspect={35 / 45}
              onCropChange={setCrop1}
              onCropComplete={onCropComplete1}
              onZoomChange={setZoom1}
            />
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <label className="text-xs text-slate-500 block mb-2 font-medium">Zoom</label>
            <input
              type="range"
              value={zoom1}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom1(e.target.value)}
              className="w-full accent-blue-600"
            />
          </div>
        </Card>

        {/* Cropper 2 */}
        <Card className="flex flex-col overflow-hidden bg-white shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-100 font-medium text-slate-700 bg-slate-50 flex justify-between items-center">
            <span>Photo 2</span>
            <div className="flex bg-slate-200 rounded-lg p-1">
              <button 
                onClick={() => handleBgChange(1, 'original')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bg2 === 'original' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >Original</button>
              <button 
                onClick={() => handleBgChange(1, 'white')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bg2 === 'white' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >White</button>
              <button 
                onClick={() => handleBgChange(1, 'blue')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bg2 === 'blue' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >Blue</button>
            </div>
          </div>
          <div className="relative w-full h-[400px] bg-slate-100">
            {isProcessing2 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 z-10">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <span className="text-sm text-slate-600 font-medium">Removing Background...</span>
              </div>
            ) : null}
            <Cropper
              image={displayPhotos[1]}
              crop={crop2}
              zoom={zoom2}
              aspect={35 / 45}
              onCropChange={setCrop2}
              onCropComplete={onCropComplete2}
              onZoomChange={setZoom2}
            />
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <label className="text-xs text-slate-500 block mb-2 font-medium">Zoom</label>
            <input
              type="range"
              value={zoom2}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom2(e.target.value)}
              className="w-full accent-blue-600"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SimpleCrop;
