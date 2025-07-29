const express = require('express');
const cors = require('cors');
const { createWorker } = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/ocr', async (req, res) => {
  const base64 = req.body.image;
  if (!base64) return res.status(400).json({ status: 'error', message: 'Missing image' });

  const worker = await createWorker('chi_tra+eng', {
    logger: m => console.log(m),
  });

  try {
    const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');

    await worker.setParameters({
      tessedit_pageseg_mode: 6, // 從左到右段落
      preserve_interword_spaces: '1'
    });

    // ✅ 加入 timeout 控制（最多等 20 秒）
    const recognizeWithTimeout = (buffer) =>
      Promise.race([
        worker.recognize(buffer),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OCR timeout')), 20000))
      ]);

    const result = await recognizeWithTimeout(buffer);

    const text = result.data.text.trim();
    console.log('✅ OCR 成功：', text.slice(0, 50).replace(/\n/g, ' '));

    res.json({
      status: 'success',
      rawText: text
    });

  } catch (err) {
    console.error('❌ OCR error:', err);
    res.status(500).json({ status: 'error', message: 'OCR failed', detail: err.message });
  } finally {
    await worker.terminate();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ OCR Server running on port ${PORT}`);
});
