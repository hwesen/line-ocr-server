FROM node:18-slim

# 安裝必要套件與 OpenCV
RUN apt-get update && apt-get install -y \
  build-essential cmake git curl wget unzip pkg-config \
  libopencv-dev python3-opencv \
  && rm -rf /var/lib/apt/lists/*

# 建立應用資料夾
WORKDIR /app

# 複製檔案
COPY package.json ./
RUN npm install

COPY index.js ./

# 開放 port
EXPOSE 3000

# 啟動服務
CMD ["node", "index.js"]
