/*
 * Main entry point for the LINE OCR server.
 *
 * This Express application acts as a webhook endpoint for a LINE bot.
 * When the bot receives an image message (such as a prescription photo),
 * it downloads the image, performs optical character recognition (OCR)
 * using Tesseract.js with Traditional Chinese language support, and
 * returns the recognized text back to the user as a reply message.
 *
 * To configure the bot you must provide a channel access token and
 * channel secret via environment variables. See the accompanying
 * `.env.example` file for more details.
 */

require('dotenv').config();
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const { createWorker } = require('tesseract.js');

// Load LINE channel configuration from environment variables. When
// deploying to platforms such as Railway you must define these values
// in the service settings. Locally you can create a `.env` file based
// on `.env.example` in this repository.
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// Create a new LINE messaging client using the above configuration.
const client = new Client(config);

// Create an Express application. We use JSON middleware provided by
// @line/bot-sdk to verify signatures on incoming requests automatically.
const app = express();

// Register the callback route that LINE will POST events to. The
// middleware function verifies the request signature and parses the
// body. If verification fails the request is rejected.
app.post('/callback', middleware(config), (req, res) => {
  // Handle each event asynchronously. If any handler rejects the
  // promise, catch the error and return a 500 response.
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling event:', err);
      res.status(500).end();
    });
});

/**
 * Process a single LINE event. We are interested only in image
 * messages; for other event types we send a polite prompt back to
 * encourage the user to send an image instead.
 *
 * @param {object} event - The LINE event to process.
 * @returns {Promise} A promise that resolves to the result of the
 *                    replyMessage API call.
 */
async function handleEvent(event) {
  // Only handle image messages. For any other event types, reply
  // immediately asking the user to send a prescription photo. LINE
  // events include many different types such as text messages,
  // stickers, follow/unfollow events, etc.
  if (event.type !== 'message' || event.message.type !== 'image') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '請傳送處方箋照片，我會為您辨識文字。',
    });
  }

  try {
    // Retrieve the binary content of the image. The getMessageContent
    // method returns a readable stream. We collect all chunks into
    // a Buffer so that Tesseract can consume it directly.
    const stream = await client.getMessageContent(event.message.id);
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));

    // Wait for the stream to finish and concatenate the chunks.
    const buffer = await new Promise((resolve, reject) => {
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });

    // Create and configure a Tesseract worker. The worker runs OCR in
    // a separate thread so that the Node.js event loop remains
    // responsive. We load the Traditional Chinese language model
    // (`chi_tra`) before recognition.
    const worker = await createWorker();
    await worker.loadLanguage('chi_tra');
    await worker.initialize('chi_tra');

    // Perform OCR on the image buffer. The returned data object
    // contains several properties; we are interested in the `text` field.
    const {
      data: { text },
    } = await worker.recognize(buffer);

    // Terminate the worker to free resources. Without calling
    // terminate() the worker thread would persist and consume memory.
    await worker.terminate();

    // Trim any extraneous whitespace from the result. If no text
    // could be recognised, inform the user accordingly.
    const result = text && text.trim() ? text.trim() : '無法辨識任何文字。';

    // Reply to the user with the OCR result.
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: result,
    });
  } catch (error) {
    // Catch and log any errors during the download or OCR process.
    console.error('OCR error:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '辨識過程發生錯誤，請稍後再試。',
    });
  }
}

// Start the Express server. Use the PORT environment variable if
// provided (Railway and other platforms set this automatically), or
// default to 3000 when running locally. Logging to the console lets
// you verify that the server has started correctly.
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});