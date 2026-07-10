import React from 'react';
import { Upload, Crop, FileImage, Check } from 'lucide-react';
import { usePhoto } from '../context/PhotoContext';

const WizardSteps = () => {
  const { step } = usePhoto();

  const stepsList = [
    { id: 1, label: 'Upload or Capture', icon: Upload },
    { id: 2, label: 'Detect & Crop', icon: Crop },
    { id: 3, label: 'Export Sheet', icon: FileImage },
  ];

  return (
    <div className="relative w-full max-w-3xl mx-auto px-4 py-6 no-print">
      <div className="flex items-center justify-between relative z-10">
        {stepsList.map((s, index) => {
          const Icon = s.icon;
          const isCompleted = step > s.id;
          const isActive = step === s.id;

          return (
            <div key={s.id} className="flex flex-col items-center flex-1 relative">
              {/* Connector line */}
              {index > 0 && (
                <div className="absolute top-5 right-1/2 w-full h-[3px] -z-10 translate-y-1/2">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCompleted ? 'bg-blue-500' : 'bg-slate-700'
                    }`}
                    style={{ width: '100%', transform: `translateX(50%)` }}
                  />
                </div>
              )}

              {/* Step Circle */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : isActive
                    ? 'bg-indigo-950 border-blue-500 text-blue-400 font-bold shadow-lg shadow-blue-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>

              {/* Step Label */}
              <span
                className={`mt-3 text-xs md:text-sm font-medium transition-colors duration-300 ${
                  isActive ? 'text-blue-400 font-semibold' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WizardSteps;
