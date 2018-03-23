const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const kue = require('kue');
const hapi = require('hapi');
const joi = require('joi');
const config = require('./config');


const queue = kue.createQueue({
    redis: config.redisUrl,
});


const queueRangePayload = {
    start: joi.number().integer().min(1).max(50000000),
    end: joi.number().integer().min(1).max(50000000),
}

async function queueRange(req, h) {
    let job = await queue.create(
        'queueCneRequests',
        req.payload
    ).attempts(5)
     .backoff({type:'exponential'})
     .removeOnComplete(true)
     .save()
    return req.payload
}

const server = hapi.server({
    host: config.apiHost,
    port: config.apiPort
});

server.route({
    method: 'POST',
    path: '/queue/range',
    handler: queueRange,
    options: {
        validate: {
            payload: queueRangePayload
        }
    }
});

async function startServer() {
    try {
        await server.start();
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }
    console.log('Server running at:', server.info.uri);
};

startServer();