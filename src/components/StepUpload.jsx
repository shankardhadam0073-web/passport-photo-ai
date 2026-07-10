import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Upload, Camera, SwitchCamera, Image as ImageIcon, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { usePhoto } from '../context/PhotoContext';
import { useToast } from '../context/ToastContext';
import Card from './Common/Card';
import Button from './Common/Button';

const StepUpload = () => {
  const { images, addImage, removeImage, setStep } = usePhoto();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'camera'
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Webcam states
  const webcamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cameraError, setCameraError] = useState(null);

  // Get available media devices (cameras)
  const handleDevices = useCallback(
    (mediaDevices) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    },
    [selectedDeviceId]
  );

  useEffect(() => {
    if (activeTab === 'camera') {
      navigator.mediaDevices
        .enumerateDevices()
        .then(handleDevices)
        .catch((err) => {
          console.error('Error enumerating devices: ', err);
          setCameraError('Permission denied or no camera found.');
        });
    }
  }, [activeTab, handleDevices]);

  // Switch camera function
  const cycleCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  const capturePhoto = useCallback(async () => {
    if (webcamRef.current && images.length < 2) {
      const imageSrc = webcamRef.current.getScreenshot({ width: 1200, height: 1600 });
      if (imageSrc) {
        const res = await fetch(imageSrc);
        const blob = await res.blob();
        const { dataUrl, originalHires, resolution } = await compressImage(blob);
        addImage(dataUrl, { originalHires, fileSize: blob.size, resolution: '1200x1600' });
      }
    }
  }, [webcamRef, images, addImage]);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const originalHires = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          originalHires,
          fileSize: file.size,
          resolution: `${img.width}x${img.height}`
        });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = originalHires;
    });
  };

  // Process files
  const processFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    // Remaining slot check
    const remainingSlots = 2 - images.length;
    if (remainingSlots <= 0) {
      addToast('Maximum of 2 images reached. Remove an image to upload another.', 'error');
      return;
    }

    // Limit files processed to remaining slots
    const filesToProcess = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remainingSlots);

    if (filesToProcess.length === 0) {
      addToast('Please upload image files only (PNG, JPG, JPEG)', 'error');
      return;
    }

    for (const file of filesToProcess) {
      const { dataUrl, originalHires, fileSize, resolution } = await compressImage(file);
      addImage(dataUrl, { originalHires, fileSize, resolution });
    }
  };

  const handleFileChange = (e) => {
    processFiles(e.target.files);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    if (images.length < 2) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (images.length < 2) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Introduction text */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold font-display text-white mb-2">
          Create Perfect Passport Photos
        </h2>
        <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
          Upload up to **2 different photos** at the same time. We will automatically generate four identical copies for each photo in a clean printable layout.
        </p>
      </div>

      {/* Uploaded Images Preview Cards */}
      {images.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-350 tracking-wide uppercase mb-4 text-center">
            Uploaded Photos ({images.length} / 2)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto justify-center">
            {images.map((img, index) => (
              <Card key={img.id} className="p-4 flex items-center justify-between gap-4 border border-slate-800 bg-slate-900/30">
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <div className="w-14 h-18 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                    <img src={img.original} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-sm font-bold text-white block">Photo #{index + 1}</span>
                    <span className="text-[10px] text-slate-500 font-medium font-mono truncate block">
                      Size: Auto-Adjusted
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => removeImage(img.id)}
                  icon={Trash2}
                  className="px-2.5 py-2.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 shrink-0 rounded-xl"
                />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Selector (Hidden if 2 images uploaded) */}
      {images.length < 2 && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 bg-slate-900/60 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Upload Gallery
            </button>
            <button
              onClick={() => {
                setActiveTab('camera');
                setCameraError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === 'camera'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              Webcam Capture
            </button>
          </div>
        </div>
      )}

      {/* Tab Contents / Upload Zone */}
      <Card className="min-h-[320px] flex flex-col justify-center items-center relative overflow-hidden">
        {images.length >= 2 ? (
          <div className="text-center p-8 flex flex-col items-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20 shadow-lg shadow-blue-500/5 animate-pulse">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Maximum Photos Uploaded</h3>
            <p className="text-slate-400 text-sm mb-6">
              You have uploaded 2 photos. Click **Proceed to Crop** below to automatically detect faces and center your photos.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/20 hover:bg-slate-900/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-xl bg-slate-800/80 group-hover:bg-blue-600/10 group-hover:text-blue-400 flex items-center justify-center text-slate-400 transition-colors duration-300 mb-4 border border-slate-700/50 group-hover:border-blue-500/20">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Drag & Drop up to {2 - images.length} image{2 - images.length > 1 ? 's' : ''}
                </h3>
                <p className="text-slate-400 text-xs text-center mb-4 max-w-xs">
                  Supports JPEG, JPG, and PNG files. Select multiple files to upload together.
                </p>
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 text-xs"
                >
                  Browse Files
                </Button>
              </div>
            )}

            {activeTab === 'camera' && (
              <div className="w-full max-w-lg flex flex-col items-center">
                {cameraError ? (
                  <div className="flex flex-col items-center text-center p-6 bg-red-950/20 border border-red-900/50 rounded-2xl max-w-md">
                    <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                    <h4 className="text-lg font-semibold text-white mb-1">Camera Access Blocked</h4>
                    <p className="text-slate-400 text-sm mb-4">
                      We need webcam permissions to take your photo. Please grant browser camera access and try again.
                    </p>
                    <Button variant="secondary" onClick={() => setActiveTab('upload')}>
                      Upload Instead
                    </Button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center py-2">
                    {/* Camera Viewport Wrapper */}
                    <div className="relative w-full aspect-[3/4] max-w-[240px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                          width: 1200,
                          height: 1600,
                          facingMode: 'user',
                        }}
                        className="w-full h-full object-cover scale-x-[-1]"
                        onUserMediaError={() => setCameraError(true)}
                      />

                      {/* Face Guideline Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-[60%] h-[55%] border-2 border-dashed border-blue-400/60 rounded-[50%/40%] bg-blue-500/5 shadow-[0_0_0_9999px_rgba(3,7,18,0.4)] flex items-center justify-center">
                          <span className="text-[9px] text-blue-300 font-bold uppercase tracking-widest text-center px-1.5 py-0.5 rounded bg-slate-900/80 border border-blue-500/20">
                            Align Face
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Webcam Controls */}
                    <div className="flex items-center gap-3 mt-4">
                      {devices.length > 1 && (
                        <Button variant="secondary" onClick={cycleCamera} icon={SwitchCamera} className="px-3.5 py-1.5 text-xs">
                          Flip
                        </Button>
                      )}
                      <Button variant="primary" onClick={capturePhoto} icon={Camera} className="px-5 py-2 text-sm font-semibold">
                        Capture Photo #{images.length + 1}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Proceed Button */}
      {images.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button
            variant="primary"
            onClick={() => setStep(2)}
            icon={ArrowRight}
            className="px-8 py-3 text-lg font-semibold"
          >
            Proceed to Crop
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepUpload;
