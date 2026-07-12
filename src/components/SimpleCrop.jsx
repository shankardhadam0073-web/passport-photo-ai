import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Button from './Common/Button';
import Card from './Common/Card';
import { ArrowLeft, Check } from 'lucide-react';

const SimpleCrop = ({ photos, setCroppedPhotos, onBack, onNext }) => {
  const [crop1, setCrop1] = useState({ x: 0, y: 0 });
  const [zoom1, setZoom1] = useState(1);
  const [croppedAreaPixels1, setCroppedAreaPixels1] = useState(null);

  const [crop2, setCrop2] = useState({ x: 0, y: 0 });
  const [zoom2, setZoom2] = useState(1);
  const [croppedAreaPixels2, setCroppedAreaPixels2] = useState(null);

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

  const handleConfirm = async () => {
    try {
      const cropped1 = await getCroppedImg(photos[0], croppedAreaPixels1);
      const cropped2 = await getCroppedImg(photos[1], croppedAreaPixels2);
      
      setCroppedPhotos([cropped1, cropped2]);
      onNext();
    } catch (e) {
      console.error(e);
      alert('Error cropping images');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="text-slate-400">
          Back
        </Button>
        <h2 className="text-2xl font-bold text-white">Crop Photos (35x45mm ratio)</h2>
        <Button variant="primary" onClick={handleConfirm} icon={Check}>
          Confirm & Print
        </Button>
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
