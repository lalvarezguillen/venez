FROM node:8.9-alpine
WORKDIR /root
ADD store_consumer.js .
ADD config.js .
ADD package.json .
RUN npm i
CMD node store_consumer.js