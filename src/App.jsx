import React, { useState } from 'react';
import SimpleUpload from './components/SimpleUpload';
import SimpleCrop from './components/SimpleCrop';
import SimplePrint from './components/SimplePrint';
import { Sparkles } from 'lucide-react';

function App() {
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([null, null]);
  const [croppedPhotos, setCroppedPhotos] = useState([null, null]);

  const handleReset = () => {
    setPhotos([null, null]);
    setCroppedPhotos([null, null]);
    setStep(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 py-4 px-6 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold font-display text-white tracking-tight">
            Passport Photo <span className="text-blue-400">Generator</span>
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start">
        {step === 1 && (
          <SimpleUpload 
            photos={photos} 
            setPhotos={setPhotos} 
            onNext={() => setStep(2)} 
          />
        )}
        
        {step === 2 && (
          <SimpleCrop 
            photos={photos} 
            setCroppedPhotos={setCroppedPhotos}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <SimplePrint 
            croppedPhotos={croppedPhotos}
            onBack={() => setStep(2)}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

export default App;
