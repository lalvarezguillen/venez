FROM node:8.9-alpine
WORKDIR /root
ADD package.json .
RUN npm i
EXPOSE 3050
ENV REDIS_HOST=redis:6379
CMD node_modules/kue/bin/kue-dashboard \
    -p 3050 \
    -r redis://$REDIS_HOST
