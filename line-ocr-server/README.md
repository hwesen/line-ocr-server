# LINE OCR Server

`line-ocr-server` is a simple Node.js application that turns a [LINE Messaging API](https://developers.line.biz/en/services/messaging-api/) channel into an OCR assistant. When a user sends a photo of a prescription (or any image), the bot downloads the image, performs optical character recognition (OCR) using [Tesseract.js](https://github.com/naptha/tesseract.js) with Traditional Chinese language support, and replies with the recognised text. The application is designed to be deployed on cloud hosting platforms such as [Railway](https://railway.app/), but can also run locally for development and testing.

## Features

* Receives image messages from a LINE bot and downloads the binary data.
* Uses Tesseract.js to perform OCR on the image with the `chi_tra` (Traditional Chinese) language model.
* Replies to the user with the recognised text or a helpful message if no text can be extracted.
* Rejects unsupported event types politely by prompting the user to send a photo.

## Project Structure

| File/Folder        | Purpose                                                                     |
|--------------------|-----------------------------------------------------------------------------|
| `index.js`         | Express server that handles LINE webhook events and performs OCR.           |
| `package.json`     | Defines dependencies and start script.                                      |
| `.env.example`     | Template for required environment variables.                                |
| `README.md`        | This file with setup and deployment instructions.                           |

## Getting Started

### Prerequisites

* Node.js (v18 or later recommended)
* npm (comes with Node.js)
* A LINE Messaging API channel with the *bot* role enabled. You will need the **Channel Access Token** and **Channel Secret** from the LINE Developers console.

### Installation

1. **Clone this repository.**

   ```bash
   git clone https://github.com/your-username/line-ocr-server.git
   cd line-ocr-server
   ```

2. **Install dependencies.**

   ```bash
   npm install
   ```

3. **Configure environment variables.**

   Copy `.env.example` to `.env` and fill in the values for `CHANNEL_ACCESS_TOKEN` and `CHANNEL_SECRET`. Optionally set `PORT` if you want the server to listen on a custom port.

   ```bash
   cp .env.example .env
   # Edit .env and provide your LINE credentials
   ```

4. **Start the server.**

   ```bash
   npm start
   ```

   The server listens on `localhost:3000` by default (or on the `PORT` you specified). You should now expose the `/callback` endpoint to LINE using a tunnelling service like [ngrok](https://ngrok.com/) during development:

   ```bash
   ngrok http 3000
   ```

   Copy the public HTTPS URL from ngrok (e.g. `https://example.ngrok.io`) and set it as the **Webhook URL** in your LINE channel settings, appending `/callback` (e.g. `https://example.ngrok.io/callback`). Also enable the bot to receive messages by toggling **Use webhook** to *enabled* in the LINE Developers console.

### Deployment to Railway

This project is ready to deploy to [Railway](https://railway.app/). After forking the repository to your own GitHub account:

1. **Create a new Railway project.** In your Railway dashboard, click **New Project** → **Deploy from GitHub** and select your fork of `line-ocr-server`.

2. **Set environment variables.** In the Railway project settings, define the following variables under the **Variables** tab:

   * `CHANNEL_ACCESS_TOKEN` – your LINE channel access token.
   * `CHANNEL_SECRET` – your LINE channel secret.
   * (Optional) `PORT` – leave empty; Railway sets this automatically.

3. **Deploy.** Railway will install dependencies and start the server automatically. After deployment completes, copy the generated domain (e.g. `https://line-ocr-server.up.railway.app`) and use it as your webhook URL in the LINE Developers console, appended with `/callback`.

### How It Works

When your LINE bot receives an image message, LINE sends a webhook request containing an event object. This server verifies the request signature, fetches the image binary via LINE’s Content API, and runs Tesseract.js on the image. The OCR process happens asynchronously in a separate worker thread. Once complete, the bot replies with the detected text. If the message is not an image, the bot responds with a friendly prompt asking the user to send a photo.

## License

This project is open‑source under the [MIT License](LICENSE). Feel free to adapt it for your own use.