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
  const input = 'C:\\Users\\Shree\\.gemini\\antigravity-ide\\brain\\3d913064-6c10-48a8-8564-340e6bfc1493\\media__1783919829011.jpg';
  const pubDir = 'c:\\AI-Passport-Photo-Copies-Generator\\public';
  
  if (!fs.existsSync(pubDir)) {
    fs.mkdirSync(pubDir, { recursive: true });
  }

  await sharp(input).resize(192, 192).toFile(`${pubDir}\\icon-192.png`);
  await sharp(input).resize(512, 512).toFile(`${pubDir}\\icon-512.png`);
  await sharp(input).resize(64, 64).png().toFile(`${pubDir}\\favicon.ico`);
  
  console.log('Icons generated successfully.');
}

processIcons().catch(console.error);
