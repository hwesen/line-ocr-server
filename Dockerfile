FROM justadudewhohacks/opencv-nodejs:node18

WORKDIR /app

COPY package.json ./
RUN npm install

COPY index.js ./

EXPOSE 3000

CMD ["node", "index.js"]
