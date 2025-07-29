const express = require('express');
const cors = require('cors');
const { createWorker } = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 🔍 解析文字的藥品資訊欄位
function parseOCRText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const drugs = [];

  for (const line of lines) {
    // 嘗試擷取藥品資訊（名稱 + 劑量 + 單位 + 用法 + 時間 + 天數）
    const match = line.match(/(.+?)(\d+(?:\.\d+)?)(mg|g|ml|顆|錠)?(?:\s*)(早|午|晚|睡前|早上|中午|晚上)?(?:\s*)(\d+天)?(?:\s*)(.*)?/i);
    if (!match) continue;

    const [, name, dose, unit, time, daysRaw, method] = match;

    drugs.push({
      name: name?.trim() || '',
      dose: dose || '',
      unit: unit || '',
      time: time || '',
      days: daysRaw ? daysRaw.replace('天', '') : '',
      method: method?.trim() || ''
    });
  }

  return drugs;
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

    const { data: { text } } = await worker.recognize(buffer);

    const parsed = parseOCRText(text);

    res.json({
      status: 'ok',
      rawText: text,
      parsed
    });

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
