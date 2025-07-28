const express = require('express');
const cors = require('cors');
const { createWorker } = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/ocr', async (req, res) => {
  const base64 = req.body.image;
  if (!base64) return res.status(400).send('Missing image');

  const worker = await createWorker('chi_tra+eng', {
    logger: m => console.log(m),
  });

  try {
    const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');

    // 設定從左到右（psm 6）
    await worker.setParameters({
      tessedit_pageseg_mode: 6,
      preserve_interword_spaces: '1'
    });

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
