const express = require('express');
const cors = require('cors');
const { createWorker } = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 設定 timeout（單位毫秒）
const OCR_TIMEOUT = 15000; // 15 秒

app.post('/ocr', async (req, res) => {
  const base64 = req.body.image;
  if (!base64) return res.status(400).send('Missing image');

  const worker = await createWorker('chi_tra+eng', {
    logger: m => console.log(m),
  });

  try {
    const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');

    await worker.setParameters({
      tessedit_pageseg_mode: 6,
      preserve_interword_spaces: '1'
    });

    // 包一層逾時保護
    const result = await Promise.race([
      worker.recognize(buffer),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout: 超過時間未回應')), OCR_TIMEOUT)
      )
    ]);

    res.send(result.data.text);
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).send(err.message || 'OCR failed');
  } finally {
    await worker.terminate();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ OCR Server running on port ${PORT}`);
});
