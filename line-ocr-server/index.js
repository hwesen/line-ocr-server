const express = require('express');
const cors = require('cors');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp'); // ✅ 加入這行

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/ocr', async (req, res) => {
  const base64 = req.body.image;
  if (!base64) return res.status(400).send('Missing image');

  const worker = await createWorker({ logger: m => console.log(m) });

  try {
    const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');

    // ✅ 檢查解析度
    const meta = await sharp(buffer).metadata();
    if (meta.width < 800 || meta.height < 500) {
      return res.status(400).send('圖片尺寸過小，請重新拍攝清晰處方箋');
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
