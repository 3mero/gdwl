const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// مسار الشعار والتصدير
const inputFile = path.join(__dirname, 'icon.png'); // تأكد من وضع صورة شعارك هنا
const outputDir = path.join(__dirname, 'public', 'icons');

// المقاسات الأساسية التي تتطلبها المتصفحات والأجهزة
const sizes = [144, 192, 512];

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('جاري معالجة الأيقونات...');
  
  for (const size of sizes) {
    try {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain', 
          background: { r: 26, g: 32, b: 44, alpha: 0 } // خلفية شفافة
        })
        .png()
        .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
        
      console.log(`✅ تم إنشاء أيقونة ${size}x${size}`);
    } catch (err) {
      console.error(`❌ فشل إنشاء أيقونة ${size}:`, err.message);
    }
  }
}

generateIcons();
