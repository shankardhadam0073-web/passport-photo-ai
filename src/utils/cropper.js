export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // prevent CORS issues
    image.src = url;
  });

export function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width, height, rotation) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export function applySharpen(ctx, width, height, mix) {
  if (mix === 0) return;
  const weights = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  const src = ctx.getImageData(0, 0, width, height);
  const sw = src.width;
  const sh = src.height;
  const dst = ctx.createImageData(sw, sh);
  const alphaFac = mix;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const dstOff = (y * sw + x) * 4;
      let r = 0, g = 0, b = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = y + cy - halfSide;
          const scx = x + cx - halfSide;
          if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
            const srcOff = (scy * sw + scx) * 4;
            const wt = weights[cy * side + cx];
            r += src.data[srcOff] * wt;
            g += src.data[srcOff + 1] * wt;
            b += src.data[srcOff + 2] * wt;
          }
        }
      }
      dst.data[dstOff] = r * alphaFac + src.data[dstOff] * (1 - alphaFac);
      dst.data[dstOff + 1] = g * alphaFac + src.data[dstOff + 1] * (1 - alphaFac);
      dst.data[dstOff + 2] = b * alphaFac + src.data[dstOff + 2] * (1 - alphaFac);
      dst.data[dstOff + 3] = src.data[dstOff + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
}

/**
 * Crop the image, apply rotation, and filters (brightness, contrast) using Canvas API.
 */
export async function getCroppedImg(
  imageSrc,
  pixelCrop,
  rotation = 0,
  brightness = 100,
  contrast = 100,
  saturation = 100,
  exposure = 100,
  sharpness = 0,
  backgroundColor = 'original',
  backgroundMask = null
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas context to a central point on image to rotate and draw
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Extract the cropped image data from the rotated image canvas
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // Set canvas size to final crop dimensions
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image data back
  ctx.putImageData(data, 0, 0);

  // Apply visual filters (brightness, contrast, saturation, exposure)
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(canvas, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const finalBrightness = (brightness * exposure) / 100;
  ctx.filter = `brightness(${finalBrightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.filter = 'none';

  if (sharpness > 0) {
    applySharpen(ctx, canvas.width, canvas.height, sharpness / 100);
  }

  if (backgroundMask && backgroundColor !== 'original') {
    const maskImg = await createImage(backgroundMask);
    
    const mCanvas = document.createElement('canvas');
    mCanvas.width = bBoxWidth;
    mCanvas.height = bBoxHeight;
    const mCtx = mCanvas.getContext('2d');
    
    mCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
    mCtx.rotate(rotRad);
    mCtx.translate(-maskImg.width / 2, -maskImg.height / 2);
    mCtx.drawImage(maskImg, 0, 0);
    
    const maskData = mCtx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
    const mCropCanvas = document.createElement('canvas');
    mCropCanvas.width = pixelCrop.width;
    mCropCanvas.height = pixelCrop.height;
    const mCropCtx = mCropCanvas.getContext('2d');
    mCropCtx.putImageData(maskData, 0, 0);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext('2d');

    finalCtx.fillStyle = backgroundColor;
    finalCtx.fillRect(0, 0, canvas.width, canvas.height);

    mCropCtx.globalCompositeOperation = 'source-in';
    mCropCtx.drawImage(canvas, 0, 0);

    finalCtx.drawImage(mCropCanvas, 0, 0);
    
    return finalCanvas.toDataURL('image/png');
  }

  return canvas.toDataURL('image/png');
}
