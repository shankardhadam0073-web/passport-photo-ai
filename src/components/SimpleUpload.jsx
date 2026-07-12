import React, { useRef, useState, useCallback } from 'react';
import Card from './Common/Card';
import Button from './Common/Button';
import { Upload, Camera, SwitchCamera, X, Aperture } from 'lucide-react';
import Webcam from 'react-webcam';

const SimpleUpload = ({ photos, setPhotos, onNext }) => {
  const photo1Ref = useRef(null);
  const photo2Ref = useRef(null);
  const webcamRef = useRef(null);

  const [activeCameraIndex, setActiveCameraIndex] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // Default back camera on mobile

  const handleUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newPhotos = [...photos];
      newPhotos[index] = url;
      setPhotos(newPhotos);
    }
  };

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const newPhotos = [...photos];
        newPhotos[activeCameraIndex] = imageSrc;
        setPhotos(newPhotos);
        setActiveCameraIndex(null);
      }
    }
  }, [webcamRef, activeCameraIndex, photos, setPhotos]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 flex flex-col items-center">
      {/* Webcam Modal */}
      {activeCameraIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
          <div className="w-full max-w-lg relative flex flex-col items-center">
            
            {/* Header controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
              <button 
                onClick={() => setActiveCameraIndex(null)}
                className="bg-black/50 p-3 rounded-full text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <button 
                onClick={toggleCamera}
                className="bg-black/50 p-3 rounded-full text-white hover:bg-black/80 transition-colors flex items-center gap-2"
              >
                <SwitchCamera className="w-5 h-5" />
                <span className="text-sm font-medium">Switch</span>
              </button>
            </div>

            {/* Camera Viewport */}
            <div className="w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative aspect-[3/4]">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode,
                  aspectRatio: 3/4
                }}
                className="w-full h-full object-cover"
              />
              {/* Capture Button Overlay */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <button 
                  onClick={capture}
                  className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/50 hover:bg-white/40 transition-colors"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg text-blue-600">
                    <Aperture className="w-8 h-8" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Upload Passport Photos</h1>
        <p className="text-slate-500">Please upload or capture exactly 2 photos to proceed.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
        {/* Photo 1 Upload */}
        <Card className="flex-1 max-w-sm flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors shadow-none bg-white">
          <input
            type="file"
            ref={photo1Ref}
            onChange={(e) => handleUpload(e, 0)}
            className="hidden"
            accept="image/*"
          />
          {photos[0] ? (
            <div className="relative w-full aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
              <img src={photos[0]} alt="Photo 1" className="max-w-full max-h-full object-contain" />
              <button 
                onClick={() => photo1Ref.current.click()}
                className="absolute inset-0 bg-white/80 opacity-0 hover:opacity-100 flex flex-col items-center justify-center text-blue-600 font-semibold transition-opacity gap-2"
              >
                <Upload className="w-6 h-6" />
                Change Photo 1
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-4">
              <div 
                onClick={() => photo1Ref.current.click()}
                className="cursor-pointer flex flex-col items-center justify-center w-full aspect-[3/4] bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <Upload className="w-10 h-10 text-blue-500 mb-4" />
                <span className="text-slate-700 font-medium">Upload Photo 1</span>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => setActiveCameraIndex(0)} 
                icon={Camera}
                className="w-full"
              >
                Use Camera
              </Button>
            </div>
          )}
        </Card>

        {/* Photo 2 Upload */}
        <Card className="flex-1 max-w-sm flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors shadow-none bg-white">
          <input
            type="file"
            ref={photo2Ref}
            onChange={(e) => handleUpload(e, 1)}
            className="hidden"
            accept="image/*"
          />
          {photos[1] ? (
            <div className="relative w-full aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
              <img src={photos[1]} alt="Photo 2" className="max-w-full max-h-full object-contain" />
              <button 
                onClick={() => photo2Ref.current.click()}
                className="absolute inset-0 bg-white/80 opacity-0 hover:opacity-100 flex flex-col items-center justify-center text-blue-600 font-semibold transition-opacity gap-2"
              >
                <Upload className="w-6 h-6" />
                Change Photo 2
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-4">
              <div 
                onClick={() => photo2Ref.current.click()}
                className="cursor-pointer flex flex-col items-center justify-center w-full aspect-[3/4] bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <Upload className="w-10 h-10 text-blue-500 mb-4" />
                <span className="text-slate-700 font-medium">Upload Photo 2</span>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => setActiveCameraIndex(1)} 
                icon={Camera}
                className="w-full"
              >
                Use Camera
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-12 w-full max-w-md">
        <Button 
          variant="primary" 
          className="w-full py-4 text-lg font-bold"
          disabled={!photos[0] || !photos[1]}
          onClick={onNext}
        >
          Continue to Crop
        </Button>
      </div>
    </div>
  );
};

export default SimpleUpload;
