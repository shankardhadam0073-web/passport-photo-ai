import React, { useEffect, useState, memo } from 'react';
import { detectFaceFromUrl } from '../utils/detector';
import { Loader2, AlertTriangle, UserCheck } from 'lucide-react';

const FaceDetector = ({
  imageSrc,
  onFaceDetected,
  onNoFaceDetected,
  detecting,
  setDetecting,
  faceDetected,
  faceError
}) => {
  const [boundingBox, setBoundingBox] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [imageRatio, setImageRatio] = useState(1);

  useEffect(() => {
    if (!imageSrc) return;
    
    // Skip face detection scan if faceDetected or faceError has already been set for this image src
    if (faceDetected || faceError) {
      setDetecting(false);
      return;
    }
    
    let isCurrent = true;

    const runDetection = async () => {
      setDetecting(true);
      setBoundingBox(null);
      
      try {
        const faceData = await detectFaceFromUrl(imageSrc);
        if (!isCurrent) return;

        if (faceData) {
          const { boundingBox: box, imageWidth, imageHeight } = faceData;
          setNaturalSize({ width: imageWidth, height: imageHeight });
          setImageRatio(imageWidth / imageHeight);
          setBoundingBox(box);
          onFaceDetected(faceData);
        } else {
          onNoFaceDetected('No face detected. Please crop manually.');
        }
      } catch (err) {
        console.error('AI Face Detector Error: ', err);
        if (isCurrent) {
          onNoFaceDetected('AI face detection failed. Please crop manually.');
        }
      } finally {
        if (isCurrent) {
          setDetecting(false);
        }
      }
    };

    runDetection();

    return () => {
      isCurrent = false;
    };
  }, [imageSrc, faceDetected, faceError, setDetecting, onFaceDetected, onNoFaceDetected]);

  // Adjust container aspect ratio when image loads to align overlays perfectly
  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    setImageRatio(naturalWidth / naturalHeight);
  };

  // Convert bounding box coordinates to percentage values for overlay scaling
  const getBoxStyle = () => {
    if (!boundingBox || !naturalSize.width) return {};
    
    const top = (boundingBox.originY / naturalSize.height) * 100;
    const left = (boundingBox.originX / naturalSize.width) * 100;
    const width = (boundingBox.width / naturalSize.width) * 100;
    const height = (boundingBox.height / naturalSize.height) * 100;

    return {
      top: `${top}%`,
      left: `${left}%`,
      width: `${width}%`,
      height: `${height}%`,
    };
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Header label */}
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
        Original Image
        {detecting && (
          <span className="text-xs text-blue-400 normal-case font-normal flex items-center gap-1.5 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning...
          </span>
        )}
      </h3>

      {/* 2. Visual Container Wrapper */}
      <div 
        style={{ aspectRatio: imageRatio }}
        className="relative w-full max-w-md mx-auto overflow-hidden border border-slate-800 bg-slate-950/80 rounded-2xl flex items-center justify-center shadow-lg"
      >
        <img 
          src={imageSrc} 
          alt="Original portrait" 
          onLoad={handleImageLoad}
          className="w-full h-full object-cover"
        />

        {/* 3. Bounding Box Overlay */}
        {boundingBox && !detecting && (
          <div
            style={getBoxStyle()}
            className="absolute border-2 border-blue-500 rounded-md bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.6)] flex flex-col justify-start items-start p-1 pointer-events-none transition-all duration-300 animate-pulse"
          >
            <span className="text-[8px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider leading-none shadow-sm">
              Face
            </span>
          </div>
        )}

        {/* 4. Scanning lines if active */}
        {detecting && (
          <div className="absolute inset-0 bg-blue-500/5 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent absolute top-0 animate-[bounce_2s_infinite]" />
          </div>
        )}
      </div>

      {/* 5. Alerts feedback banners */}
      {faceDetected && !detecting && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-emerald-400 text-xs font-medium">
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Face detected & highlighted successfully.</span>
        </div>
      )}

      {faceError && !detecting && (
        <div className="flex items-center gap-2 px-3 py-2 bg-rose-950/20 border border-rose-800/40 rounded-xl text-rose-400 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{faceError}</span>
        </div>
      )}
    </div>
  );
};

export default memo(FaceDetector);
