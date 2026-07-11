import { FilesetResolver, FaceDetector, ImageSegmenter } from '@mediapipe/tasks-vision';
import { createImage } from './cropper';

// Suppress verbose MediaPipe WebAssembly WebGL warnings and context logs
const originalLog = console.log;
const originalWarn = console.warn;
const originalInfo = console.info;

const filterLogs = (args, originalFn) => {
  if (args.length > 0 && typeof args[0] === 'string') {
    const msg = args[0];
    if (
      msg.includes('gl_context.cc') || 
      msg.includes('OpenGL error checking is disabled') || 
      msg.includes('Graph successfully started running') ||
      msg.includes('vision_wasm_internal')
    ) {
      return;
    }
  }
  originalFn.apply(console, args);
};

console.log = (...args) => filterLogs(args, originalLog);
console.warn = (...args) => filterLogs(args, originalWarn);
console.info = (...args) => filterLogs(args, originalInfo);

let visionResolverPromise = null;

async function getVisionResolver() {
  if (visionResolverPromise) return visionResolverPromise;
  visionResolverPromise = FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
  );
  return visionResolverPromise;
}

let faceDetectorPromise = null;

/**
 * Initializes and caches the MediaPipe Face Detector.
 * Loads the WebAssembly and TFLite model from CDNs.
 */
export async function initFaceDetector() {
  if (faceDetectorPromise) return faceDetectorPromise;

  faceDetectorPromise = (async () => {
    const vision = await getVisionResolver();
    return await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        delegate: "GPU"
      },
      runningMode: "IMAGE"
    });
  })();

  return faceDetectorPromise;
}

/**
 * Detects the first face in an image URL and returns its details.
 */
export function detectFaceFromUrl(imageUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      const img = await createImage(imageUrl);
      const detector = await initFaceDetector();

      const processDetection = () => {
        try {
          const detectionResult = detector.detect(img);
          if (detectionResult && detectionResult.detections && detectionResult.detections.length > 0) {
            const sortedDetections = [...detectionResult.detections].sort((a, b) => {
              const areaA = a.boundingBox.width * a.boundingBox.height;
              const areaB = b.boundingBox.width * b.boundingBox.height;
              return areaB - areaA;
            });
            const detection = sortedDetections[0];
            const boundingBox = detection.boundingBox;
            
            resolve({
              boundingBox,
              imageWidth: img.naturalWidth || img.width,
              imageHeight: img.naturalHeight || img.height,
            });
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(err);
        }
      };

      if (window.requestIdleCallback) {
        window.requestIdleCallback(processDetection, { timeout: 1000 });
      } else {
        setTimeout(processDetection, 10);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calculates initial zoom, crop state, and pixel cropped coordinates 
 * for react-easy-crop to frame the detected face appropriately.
 */
export function calculatePassportCrop(faceData, targetAspect = 1) {
  const { boundingBox, imageWidth, imageHeight } = faceData;
  
  // Coordinates of the center of the face
  const faceCenterX = boundingBox.originX + boundingBox.width / 2;
  const faceCenterY = boundingBox.originY + boundingBox.height / 2;
  
  // Standard passport photo specs:
  // The face should occupy about 75% of the image height.
  let cropHeight = boundingBox.height / 0.75;
  let cropWidth = cropHeight * targetAspect;
  
  // Boundary constraints
  if (cropWidth > imageWidth) {
    cropWidth = imageWidth;
    cropHeight = cropWidth / targetAspect;
  }
  if (cropHeight > imageHeight) {
    cropHeight = imageHeight;
    cropWidth = cropHeight * targetAspect;
  }

  // Calculate top margin (e.g. 8% of total crop height)
  let y = boundingBox.originY - (cropHeight * 0.08);
  let x = faceCenterX - (cropWidth / 2);

  // Boundary clamp
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + cropWidth > imageWidth) x = imageWidth - cropWidth;
  if (y + cropHeight > imageHeight) y = imageHeight - cropHeight;

  // Calculate zoom and crop offsets for react-easy-crop
  // zoom is the scale relative to standard fitting
  const fitWidthZoom = imageWidth / cropWidth;
  const fitHeightZoom = imageHeight / cropHeight;
  const zoomFactor = Math.max(1, Math.min(fitWidthZoom, fitHeightZoom));
  
  // React Easy Crop translates offsets relative to center in container percentage.
  // We can approximate the crop state by mapping offset pixels relative to center
  const imageCenterX = imageWidth / 2;
  const imageCenterY = imageHeight / 2;
  
  const offsetX = imageCenterX - faceCenterX;
  const offsetY = imageCenterY - faceCenterY;
  
  // Scale the offsets according to zoom factor
  const cropX = (offsetX / imageWidth) * 100 * zoomFactor;
  const cropY = (offsetY / imageHeight) * 100 * zoomFactor;
  
  return {
    crop: { x: cropX, y: cropY },
    zoom: zoomFactor,
    pixelCrop: {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight)
    }
  };
}

let segmenterPromise = null;

export async function initImageSegmenter() {
  if (segmenterPromise) return segmenterPromise;

  segmenterPromise = (async () => {
    const vision = await getVisionResolver();
    return await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
        delegate: "GPU"
      },
      runningMode: "IMAGE",
      outputCategoryMask: true,
      outputConfidenceMasks: false
    });
  })();

  return segmenterPromise;
}

export function segmentBackground(imageUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      const img = await createImage(imageUrl);
      const segmenter = await initImageSegmenter();
      
      const processSegmentation = () => {
        try {
          const segmentationResult = segmenter.segment(img);
          
          if (segmentationResult && segmentationResult.categoryMask) {
            const mask = segmentationResult.categoryMask.getAsUint8Array();
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(img.width, img.height);
            
            // Check the four corners to determine the background value
            const corners = [
              mask[0], // Top-Left
              mask[img.width - 1], // Top-Right
              mask[(img.height - 1) * img.width], // Bottom-Left
              mask[(img.height - 1) * img.width + img.width - 1] // Bottom-Right
            ];
            
            // The most frequent value in the corners is almost certainly the background
            const counts = {};
            let bgValue = 0;
            let maxCount = 0;
            for (const val of corners) {
              counts[val] = (counts[val] || 0) + 1;
              if (counts[val] > maxCount) {
                maxCount = counts[val];
                bgValue = val;
              }
            }

            for (let i = 0; i < mask.length; ++i) {
              // If the pixel is NOT the background value, it is the person.
              // Make person opaque (255) and background transparent (0).
              const val = mask[i] !== bgValue ? 255 : 0;
              const offset = i * 4;
              imageData.data[offset] = 0;
              imageData.data[offset + 1] = 0;
              imageData.data[offset + 2] = 0;
              imageData.data[offset + 3] = val;
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(err);
        }
      };

      if (window.requestIdleCallback) {
        window.requestIdleCallback(processSegmentation, { timeout: 2000 });
      } else {
        setTimeout(processSegmentation, 10);
      }
    } catch (error) {
      reject(error);
    }
  });
}
