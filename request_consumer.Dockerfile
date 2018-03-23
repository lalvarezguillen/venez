FROM node:8.9-alpine
WORKDIR /root
ADD request_consumer.js .
ADD config.js .
ADD package.json .
RUN npm i
CMD node request_consumer.js