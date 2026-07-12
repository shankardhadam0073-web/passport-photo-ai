import React, { useState } from 'react';
import SimpleUpload from './components/SimpleUpload';
import SimpleCrop from './components/SimpleCrop';
import PrintLayout from './components/PrintLayout';
import { Camera } from 'lucide-react';

function App() {
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([null, null]);
  const [croppedPhotos, setCroppedPhotos] = useState([null, null]);

  const handlePrintTrigger = (cropped) => {
    setCroppedPhotos(cropped);
    // Give React a moment to render the PrintLayout to the DOM
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 py-4 px-6 flex items-center justify-between no-print shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight">
              AI Passport Photo Printer
            </h1>
            <span className="text-xs text-slate-500 font-medium">
              Professional 4×6 Passport Photo Printing
            </span>
          </div>
        </div>
        <div className="text-sm font-medium text-slate-500 hidden sm:block">
          Developed by <span className="text-slate-700">Shankar Dhadam</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start no-print">
        {step === 1 && !croppedPhotos[0] && (
          <SimpleUpload 
            photos={photos} 
            setPhotos={setPhotos} 
            onNext={() => setStep(2)} 
          />
        )}
        
        {step === 2 && !croppedPhotos[0] && (
          <SimpleCrop 
            photos={photos} 
            onBack={() => setStep(1)}
            onPrintTrigger={handlePrintTrigger}
          />
        )}
      </main>
      
      {/* Visible Print Preview on screen after generating */}
      {croppedPhotos[0] && (
        <div className="flex-grow flex flex-col items-center justify-start relative">
          <button 
            onClick={() => setCroppedPhotos([null, null])}
            className="absolute top-8 left-8 px-4 py-2 bg-white text-slate-700 font-medium rounded-lg shadow-sm hover:bg-slate-50 transition-colors border border-slate-200 no-print z-10"
          >
            ← Back to Editing
          </button>
          <div className="w-full">
            <PrintLayout croppedPhotos={croppedPhotos} />
          </div>
        </div>
      )}

      {/* Hidden print layer for actual printing (if not already handled by PrintLayout) */}
      <div className="hidden print:block">
        {!croppedPhotos[0] && <PrintLayout croppedPhotos={croppedPhotos} />}
      </div>
    </div>
  );
}

export default App;
