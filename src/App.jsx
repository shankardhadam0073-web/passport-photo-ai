import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { PhotoProvider, usePhoto } from './context/PhotoContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import WizardSteps from './components/WizardSteps';
import StepUpload from './components/StepUpload';
import StepCrop from './components/StepCrop';
import StepPreview from './components/StepPreview';
import Requirements from './components/Requirements';
import Sidebar from './components/Sidebar';
import { Sparkles, BookOpen } from 'lucide-react';

// Main content dispatcher based on current context step
const EditorContainer = () => {
  const { step } = usePhoto();

  return (
    <div className="flex-1 flex flex-col items-center">
      {step === 1 && <StepUpload />}
      {step === 2 && <StepCrop />}
      {step === 3 && <StepPreview />}
    </div>
  );
};

// Layout component to selectively show navigation/stepper elements
const Layout = () => {
  const location = useLocation();
  const isRequirementsPage = location.pathname === '/requirements';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Premium Header */}
      <Navbar />

      {/* Wizard Step Progression - only shown on editor route */}
      {!isRequirementsPage && <WizardSteps />}

      {/* Main Page Content */}
      <main className="flex-grow flex flex-col sm:flex-row justify-start items-stretch">
        {!isRequirementsPage && (
          <div className="no-print hidden md:block">
            <Sidebar />
          </div>
        )}
        <div className="flex-grow flex flex-col justify-start">
          <Routes>
            <Route path="/" element={<EditorContainer />} />
            <Route path="/requirements" element={<Requirements />} />
          </Routes>
        </div>
      </main>

      {/* Footer (Hidden when printing) */}
      <footer className="w-full py-8 border-t border-slate-900 bg-slate-950/40 text-center no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>AI Passport Photo Copies Generator © 2026</span>
          </div>

          <div className="flex items-center gap-6">
            {!isRequirementsPage ? (
              <Link
                to="/requirements"
                className="flex items-center gap-1.5 hover:text-slate-350 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                View Passport Photo Standards
              </Link>
            ) : (
              <Link to="/" className="hover:text-slate-350 transition-colors">
                Back to Generator
              </Link>
            )}
            <a
              href="https://github.com/google-deepmind"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-350 transition-colors"
            >
              Developer Info
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <PhotoProvider>
        <Router>
          <Layout />
        </Router>
      </PhotoProvider>
    </ToastProvider>
  );
}

export default App;
