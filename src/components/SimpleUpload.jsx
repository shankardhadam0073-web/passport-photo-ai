import React, { useRef } from 'react';
import Card from './Common/Card';
import Button from './Common/Button';
import { Upload, Camera } from 'lucide-react';

const SimpleUpload = ({ photos, setPhotos, onNext }) => {
  const photo1Ref = useRef(null);
  const photo2Ref = useRef(null);
  const camera1Ref = useRef(null);
  const camera2Ref = useRef(null);

  const handleUpload = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newPhotos = [...photos];
      newPhotos[index] = url;
      setPhotos(newPhotos);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 flex flex-col items-center">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Upload Passport Photos</h1>
        <p className="text-slate-500">Please upload or capture exactly 2 photos to proceed.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
        {/* Photo 1 Upload */}
        <Card className="flex-1 max-w-sm flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 shadow-none bg-white group">
          <input
            type="file"
            ref={photo1Ref}
            onChange={(e) => handleUpload(e, 0)}
            className="hidden"
            accept="image/*"
          />
          <input
            type="file"
            ref={camera1Ref}
            onChange={(e) => handleUpload(e, 0)}
            className="hidden"
            accept="image/*"
            capture="environment"
          />
          {photos[0] ? (
            <div className="relative w-full aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 shadow-inner group">
              <img src={photos[0]} alt="Photo 1" className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" />
              <button 
                onClick={() => photo1Ref.current.click()}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white font-semibold transition-all duration-300 gap-3"
              >
                <div className="p-3 bg-white/20 rounded-full">
                  <Upload className="w-8 h-8" />
                </div>
                Replace Photo 1
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-4">
              <div 
                onClick={() => photo1Ref.current.click()}
                className="cursor-pointer flex flex-col items-center justify-center w-full aspect-[3/4] bg-slate-50 rounded-xl hover:bg-blue-50 transition-all duration-300 border border-slate-200 hover:border-blue-200 group-hover:bg-slate-100"
              >
                <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 text-blue-500 group-hover:text-blue-600">
                  <Upload className="w-12 h-12" />
                </div>
                <span className="text-slate-700 font-semibold text-lg">Upload Photo 1</span>
                <span className="text-slate-400 text-sm mt-1">Tap to browse files</span>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => camera1Ref.current.click()} 
                icon={Camera}
                className="w-full"
              >
                Use Camera
              </Button>
            </div>
          )}
        </Card>

        {/* Photo 2 Upload */}
        <Card className="flex-1 max-w-sm flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 shadow-none bg-white group">
          <input
            type="file"
            ref={photo2Ref}
            onChange={(e) => handleUpload(e, 1)}
            className="hidden"
            accept="image/*"
          />
          <input
            type="file"
            ref={camera2Ref}
            onChange={(e) => handleUpload(e, 1)}
            className="hidden"
            accept="image/*"
            capture="environment"
          />
          {photos[1] ? (
            <div className="relative w-full aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 shadow-inner group">
              <img src={photos[1]} alt="Photo 2" className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105" />
              <button 
                onClick={() => photo2Ref.current.click()}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white font-semibold transition-all duration-300 gap-3"
              >
                <div className="p-3 bg-white/20 rounded-full">
                  <Upload className="w-8 h-8" />
                </div>
                Replace Photo 2
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-4">
              <div 
                onClick={() => photo2Ref.current.click()}
                className="cursor-pointer flex flex-col items-center justify-center w-full aspect-[3/4] bg-slate-50 rounded-xl hover:bg-blue-50 transition-all duration-300 border border-slate-200 hover:border-blue-200 group-hover:bg-slate-100"
              >
                <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 text-blue-500 group-hover:text-blue-600">
                  <Upload className="w-12 h-12" />
                </div>
                <span className="text-slate-700 font-semibold text-lg">Upload Photo 2</span>
                <span className="text-slate-400 text-sm mt-1">Tap to browse files</span>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => camera2Ref.current.click()} 
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
