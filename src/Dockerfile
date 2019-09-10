FROM node:alpine

WORKDIR /app

RUN npm install node-fetch dateformat

ADD main.js /app/main.js

ENV API_KEY ""
ENV API_USER ""

CMD [ "node" ,"/app/main.js" ]