import React, { useRef } from 'react';
import Card from './Common/Card';
import Button from './Common/Button';
import { Upload } from 'lucide-react';

const SimpleUpload = ({ photos, setPhotos, onNext }) => {
  const photo1Ref = useRef(null);
  const photo2Ref = useRef(null);

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
        <h1 className="text-3xl font-bold text-white mb-3">Upload Passport Photos</h1>
        <p className="text-slate-400">Please upload exactly 2 photos to proceed.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
        {/* Photo 1 Upload */}
        <Card className="flex-1 max-w-sm flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-blue-500 transition-colors">
          <input
            type="file"
            ref={photo1Ref}
            onChange={(e) => handleUpload(e, 0)}
            className="hidden"
            accept="image/*"
          />
          {photos[0] ? (
            <div className="relative w-full aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={photos[0]} alt="Photo 1" className="max-w-full max-h-full object-contain" />
              <button 
                onClick={() => photo1Ref.current.click()}
                className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white font-medium transition-opacity"
              >
                Change Photo 1
              </button>
            </div>
          ) : (
            <div 
              onClick={() => photo1Ref.current.click()}
              className="cursor-pointer flex flex-col items-center justify-center w-full aspect-[3/4] bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Upload className="w-10 h-10 text-slate-400 mb-4" />
              <span className="text-slate-300 font-medium">Upload Photo 1</span>
            </div>
          )}
        </Card>

        {/* Photo 2 Upload */}
        <Card className="flex-1 max-w-sm flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-blue-500 transition-colors">
          <input
            type="file"
            ref={photo2Ref}
            onChange={(e) => handleUpload(e, 1)}
            className="hidden"
            accept="image/*"
          />
          {photos[1] ? (
            <div className="relative w-full aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={photos[1]} alt="Photo 2" className="max-w-full max-h-full object-contain" />
              <button 
                onClick={() => photo2Ref.current.click()}
                className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white font-medium transition-opacity"
              >
                Change Photo 2
              </button>
            </div>
          ) : (
            <div 
              onClick={() => photo2Ref.current.click()}
              className="cursor-pointer flex flex-col items-center justify-center w-full aspect-[3/4] bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Upload className="w-10 h-10 text-slate-400 mb-4" />
              <span className="text-slate-300 font-medium">Upload Photo 2</span>
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
