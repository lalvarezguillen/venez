FROM node:8.9-alpine
WORKDIR /root
ADD consumer.js .
ADD config.js .
ADD package.json .
RUN npm i
CMD node consumer.js