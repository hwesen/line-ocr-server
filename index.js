const express = require('express');
const cors = require('cors');
const sharp = require('sharp');
const cv = require('opencv4nodejs');
const { createWorker } = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 模糊檢查函式
async function isImageBlurry(buffer, threshold = 100) {
  const image = await sharp(buffer).grayscale().raw().toBuffer({ resolveWithObject: true });
  const mat = new cv.Mat(image.data, image.info.height, image.info.width, cv.CV_8UC1);
  const laplacian = mat.laplacian(cv.CV_64F);
  const variance = laplacian.pow(2).mean().w;
  return variance < threshold;
}

app.post('/ocr', async (req, res) => {
  const base64 = req.body.image;
  if (!base64) return res.status(400).send('Missing image');

  const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(rawBase64, 'base64');

  try {
    // 模糊度檢查
    const blurry = await isImageBlurry(buffer);
    if (blurry) {
      return res.status(400).send('圖片可能過於模糊，請重新拍攝');
    }

    const worker = await createWorker('chi_tra+eng', 1, {
      logger: m => console.log(m)
    });

    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    res.send(text);
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).send('OCR failed');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ OCR Server running on port ${PORT}`);
});
