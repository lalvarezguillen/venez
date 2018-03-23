FROM node:8.9-alpine
WORKDIR /root
ADD producer.js .
ADD config.js .
ADD package.json .
RUN npm i
CMD node producer.js -s $FIRST_CI -e $LAST_CI -c $CI_BATCH -t $BATCH_TIMEOUT