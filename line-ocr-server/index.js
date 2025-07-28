const express = require('express');
const cors = require('cors');
const { createWorker } = require('tesseract.js');
const cv = require('opencv4nodejs');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 模糊度檢測函式：使用 Laplacian variance
async function isImageBlurry(buffer, threshold = 100) {
  const image = await sharp(buffer).resize(1200).grayscale().raw().toBuffer({ resolveWithObject: true });
  const mat = new cv.Mat(image.data, image.info.height, image.info.width, cv.CV_8UC1);
  const laplacian = mat.laplacian(cv.CV_64F);
  const mean = laplacian.meanStdDev();
  const variance = Math.pow(mean.stddev.at(0, 0), 2);
  return variance < threshold;
}

app.post('/ocr', async (req, res) => {
  const base64 = req.body.image;
  if (!base64) return res.status(400).send('Missing image');

  const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(rawBase64, 'base64');

  // 檢查模糊度
  try {
    const blurry = await isImageBlurry(buffer);
    if (blurry) {
      return res.status(400).send('圖片模糊，請重拍');
    }
  } catch (e) {
    console.error('模糊度分析失敗', e);
  }

  const worker = await createWorker('chi_tra+eng', { logger: m => console.log(m) });

  try {
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
