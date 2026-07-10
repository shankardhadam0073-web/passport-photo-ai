import React from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { usePhoto } from '../context/PhotoContext';
import Button from './Common/Button';

const Navbar = () => {
  const { images, resetAll } = usePhoto();

  return (
    <header className="sticky top-0 z-50 w-full glass no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display tracking-tight text-white m-0 p-0 leading-none">
               AI Passport Photo
            </h1>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
              Copies Generator
            </span>
          </div>
        </div>

        {/* Action Button */}
        {images && images.length > 0 && (
          <Button
            variant="ghost"
            onClick={resetAll}
            icon={RefreshCw}
            className="text-xs py-1.5 px-3 hover:bg-slate-800 text-slate-300"
          >
            Start Over
          </Button>
        )}
      </div>
    </header>
  );
};

export default Navbar;
