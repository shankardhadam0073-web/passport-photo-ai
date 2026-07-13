const fs = require('fs');
const { execSync } = require('child_process');

try {
  require.resolve('sharp');
} catch (e) {
  console.log('Installing sharp...');
  execSync('npm install sharp --no-save', { stdio: 'inherit' });
}

const sharp = require('sharp');

async function processIcons() {
  const input = 'C:\\Users\\Shree\\.gemini\\antigravity-ide\\brain\\3d913064-6c10-48a8-8564-340e6bfc1493\\passport_printer_icon_1783918822597.png';
  const pubDir = 'c:\\AI-Passport-Photo-Copies-Generator\\public';
  
  if (!fs.existsSync(pubDir)) {
    fs.mkdirSync(pubDir, { recursive: true });
  }

  await sharp(input).resize(192, 192).toFile(`${pubDir}\\icon-192.png`);
  await sharp(input).resize(512, 512).toFile(`${pubDir}\\icon-512.png`);
  // Generate favicon.ico (most browsers handle PNG bytes in .ico extension, or we can just output .png and reference it)
  // But let's create a 64x64 PNG and name it favicon.ico
  await sharp(input).resize(64, 64).png().toFile(`${pubDir}\\favicon.ico`);
  
  console.log('Icons generated successfully.');
}

processIcons().catch(console.error);
