const express = require('express');
const cors = require('cors');
const { createWorker } = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 藥品解析邏輯
function parseDrugs(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result = [];

  const regex = /^(\d+\.?)?\s*([\w\-\+\(\)\/]+.*?)\s+([\d\.]+)\s*([a-zA-Zμ]+)\s+(.+?)\s+(\d+)\s+(.*)$/i;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      result.push({
        name: match[2],
        dosage: match[3],
        unit: match[4],
        frequency: match[5],
        days: match[6],
        route: match[7]
      });
    }
  }

  return result;
}

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

    // 限制 OCR 時間最多 20 秒
    const recognizeWithTimeout = Promise.race([
      worker.recognize(buffer),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OCR timeout')), 20000))
    ]);

    const { data: { text } } = await recognizeWithTimeout;

    const parsed = parseDrugs(text);

    res.json({
      rawText: text,
      parsed
    });

  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'OCR failed', detail: err.message });
  } finally {
    await worker.terminate();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ OCR Server running on port ${PORT}`);
});
