FROM node:22.2

WORKDIR /app
COPY package.json .
RUN npm install
RUN npx playwright install-deps
RUN npx playwright install 
COPY . .
CMD npm start