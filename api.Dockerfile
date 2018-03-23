FROM node:8.9-alpine
WORKDIR /root
ADD api.js .
ADD config.js .
ADD package.json .
RUN npm i
EXPOSE 80
CMD node api.js