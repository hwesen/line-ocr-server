const express = require('express');
const cors = require('cors');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const cv = require('opencv4nodejs'); // ✅ 加入 OpenCV

const app = express(); 
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ✅ 模糊度判斷（回傳 true = 模糊）
function isImageBlurred(buffer, threshold = 100) {
  const img = cv.imdecode(buffer); // 轉為 Mat 格式
  const gray = img.bgrToGray();
  const laplacian = gray.laplacian(cv.CV_64F);
  const mean = laplacian.meanStdDev();
  const variance = mean.stddev.at(0, 0) ** 2;

  console.log('📉 Laplacian Variance:', variance);
  return variance < threshold;
}

app.post('/ocr', async (req, res) => {
  const base64 = req.body.image;
  if (!base64) return res.status(400).send('Missing image');

  const worker = await createWorker({ logger: m => console.log(m) });

  try {
    const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');

    const meta = await sharp(buffer).metadata();
    if (meta.width < 800 || meta.height < 500) {
      return res.status(400).send('圖片尺寸過小，請重新拍攝');
    }

    if (isImageBlurred(buffer)) {
      return res.status(400).send('圖片可能過於模糊，請重拍');
    }

    await worker.loadLanguage('chi_tra+eng');
    await worker.initialize('chi_tra+eng');
    await worker.setParameters({ tessedit_pageseg_mode: 6 });

    const { data: { text } } = await worker.recognize(buffer);
    res.send(text);
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).send('OCR failed');
  } finally {
    await worker.terminate();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ OCR Server running on port ${PORT}`);
});
