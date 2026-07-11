const fs = require('fs');

let code = fs.readFileSync('src/components/StepPreview.jsx', 'utf8');

const layoutCode = `  const generateLayout = (imagesArray) => {
    const paper = { w: 101.6, h: 152.4, pad: 0 };
    const gapMm = 2;
    const photoW = 45; // 35x45 rotated 90 degrees
    const photoH = 35;
    
    let layoutImages = [];
    let cols = 2;
    let rows = 2;
    
    if (imagesArray.length === 1) {
      layoutImages = [imagesArray[0], imagesArray[0], imagesArray[0], imagesArray[0]];
      rows = 2;
    } else if (imagesArray.length >= 2) {
      layoutImages = [
        imagesArray[0], imagesArray[0], imagesArray[0], imagesArray[0],
        imagesArray[1], imagesArray[1], imagesArray[1], imagesArray[1]
      ];
      rows = 4;
    } else {
      return { paper, items: [], gridW: 0, gridH: 0 };
    }
    
    const gridW = cols * photoW + (cols - 1) * gapMm;
    const gridH = rows * photoH + (rows - 1) * gapMm;
    
    const startX = (paper.w - gridW) / 2;
    const startY = (paper.h - gridH) / 2;
    
    const items = layoutImages.map((img, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return {
        img,
        id: \`sheet-\${img?.id || i}-\${i}\`,
        x: startX + c * (photoW + gapMm),
        y: startY + r * (photoH + gapMm),
        w: photoW,
        h: photoH,
        rotate: true
      };
    });
    
    return { paper, items, gridW, gridH };
  };`;

// 1. Insert generateLayout before calculateMaxCopies and replace calculateMaxCopies entirely.
let cmcStart = code.indexOf('  const calculateMaxCopies = () => {');
let cmcEnd = code.indexOf('  const layoutInfo = calculateMaxCopies();');
code = code.substring(0, cmcStart) + layoutCode + '\n' + code.substring(cmcEnd);


// 2. We need to update renderSheetContent to use generateLayout
const newRenderSheet = `  const renderSheetContent = () => {
    const layout = generateLayout(activeImagesArray);
    const paperPad = currentSheet.pad || 0;

    return (
      <div 
        className="w-full h-full relative box-border overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        ref={sheetScaleRef}
      >
        <div 
          style={{ 
            position: 'absolute',
            left: \`\${paperPad}mm\`,
            top: \`\${paperPad}mm\`,
            width: \`calc(100% - \${2 * paperPad}mm)\`,
            height: \`calc(100% - \${2 * paperPad}mm)\`,
            transform: \`translate(\${offset.x}mm, \${offset.y}mm)\`,
            transition: dragState.id ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          {layout.items.map((item, idx) => (
            <div
              key={item.id + idx}
              style={{ 
                position: 'absolute',
                left: \`\${item.x}mm\`,
                top: \`\${item.y}mm\`,
                width: \`\${item.w}mm\`, 
                height: \`\${item.h}mm\`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                ...(includePhotoBorder ? { border: '1px solid #cbd5e1' } : {})
              }}
            >
              {includeCutLines && (
                <div style={{ position: 'absolute', top: '-6px', left: '-6px', right: '-6px', bottom: '-6px', border: '1px dashed rgba(203, 213, 225, 0.6)', pointerEvents: 'none' }} />
              )}
              {item.img?.croppedPreview ? (
                <img 
                  src={item.img.croppedPreview} 
                  alt="Passport Cutout" 
                  style={item.rotate ? {
                    width: \`\${item.h}mm\`,
                    height: \`\${item.w}mm\`,
                    transform: 'rotate(90deg)',
                    transformOrigin: 'center',
                    objectFit: 'cover'
                  } : {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '500' }}>No Image</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };`;

// Replace renderSheetContent
let rscStart = code.indexOf('  const renderSheetContent = (imagesToRender) => {');
let rscEnd = code.indexOf('  };', rscStart) + 4;
code = code.substring(0, rscStart) + newRenderSheet + code.substring(rscEnd);

// 3. We also need to fix generateCanvasFromState to use generateLayout
const newCanvasGen = `  const generateCanvasFromState = async () => {
    const layout = generateLayout(activeImagesArray);
    const DPI = 600;
    const pxPerMm = DPI / 25.4;
    
    const canvas = document.createElement('canvas');
    const canvasW = Math.round(layout.paper.w * pxPerMm);
    const canvasH = Math.round(layout.paper.h * pxPerMm);
    canvas.width = canvasW;
    canvas.height = canvasH;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const loadedImages = {};
    for (const item of layout.items) {
      if (!loadedImages[item.img.id]) {
        loadedImages[item.img.id] = await new Promise((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = item.img.croppedPreview;
        });
      }
    }
    
    for (const item of layout.items) {
      const htmlImage = loadedImages[item.img.id];
      const xPx = Math.round(item.x * pxPerMm);
      const yPx = Math.round(item.y * pxPerMm);
      const wPx = Math.round(item.w * pxPerMm);
      const hPx = Math.round(item.h * pxPerMm);
      
      if (htmlImage) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(xPx, yPx, wPx, hPx);
        ctx.save();
        ctx.translate(xPx + wPx / 2, yPx + hPx / 2);
        if (item.rotate) {
          ctx.rotate((90 * Math.PI) / 180);
          let sW = htmlImage.width;
          let sH = htmlImage.height;
          const imgR = sW / sH;
          const tR = hPx / wPx; 
          let sx = 0, sy = 0;
          if (imgR > tR) {
            sW = sH * tR;
            sx = (htmlImage.width - sW) / 2;
          } else {
            sH = sW / tR;
            sy = (htmlImage.height - sH) / 2;
          }
          ctx.drawImage(htmlImage, sx, sy, sW, sH, -hPx / 2, -wPx / 2, hPx, wPx);
        }
        ctx.restore();
      }
      
      if (includePhotoBorder) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(1, Math.round(1 * (DPI / 96)));
        ctx.strokeRect(xPx, yPx, wPx, hPx);
      }
    }
    
    const fontSizePx = Math.round(8 * (DPI / 96));
    ctx.font = \`\${fontSizePx}px monospace\`;
    ctx.fillStyle = '#94a3b8';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    
    const textMarginXPx = Math.round(16 * (DPI / 96));
    const textMarginYPx = Math.round(12 * (DPI / 96));
    ctx.fillText('AI PASSPORT PHOTO COPIES', textMarginXPx, textMarginYPx);
    ctx.textAlign = 'right';
    ctx.fillText('SCALE: 100%', canvasW - textMarginXPx, textMarginYPx);
    
    return canvas;
  };`;

let cgsStart = code.indexOf('  const generateCanvasFromState = async (flattenedImages) => {');
let cgsEnd = code.indexOf('  };', code.indexOf('ctx.fillText(`Paper:', cgsStart)) + 4;
code = code.substring(0, cgsStart) + newCanvasGen + code.substring(cgsEnd);

fs.writeFileSync('src/components/StepPreview.jsx', code);
console.log('Fixed StepPreview.jsx');
