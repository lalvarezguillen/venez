const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const cheerio = require('cheerio');
const delay = require('delay');
const range = require('range');
const kue = require('kue');
const commander = require('commander');
const config = require('./config');

function createCIGen(initial, nat) {
    if (nat.toUpperCase() != 'V' && nat.toUpperCase() != 'E') {
        console.log(nat.toUpperCase())
        throw(`${nat} is not valid.`)
    }
    let lastCI = initial;
    return function () {
        lastCI += 1;
        return {
            num: lastCI,
            nat: nat
        }
    }
}

async function getSaimeData(ci, nat){
    try {
        const resp = await axios.post(
            config.saimeUrl,
            {
                cedula: ci,
                nacionalidad: nat
            });
        console.log(resp.status);
        console.log(resp.data)
        return resp
    }
    catch (error) {
        console.log(error);
    }    
}

async function getCneData(ci, nat) {
    const url = `${config.cneUrlBase}?nacionalidad=${nat}&cedula=${ci}`;
    const key = `${nat}${ci}`;
    try {
        const resp = await axios.get(url);
        const dom = cheerio.load(resp.data);
        if (isRegisteredInCne(dom)) {
            return parseCneData(dom);
        }
    }
    catch (error){
        console.log(error);
    }
}

function isRegisteredInCne(dom){
    return (
        !Boolean(dom('td').eq(11).text().match('no corresponde')) &&
        !Boolean(dom('td').eq(15).text().match('no se encuentra'))
    );
}

function parseCneData(dom) {
    const data = {
        cedula: dom('td').eq(11).text(),
        nombre: dom('td').eq(13).text(),
        estado: dom('td').eq(15).text(),
        municipio: dom('td').eq(17).text(),
        parroquia: dom('td').eq(19).text(),
        centro: dom('td').eq(21).text(),
        direccion: dom('td').eq(23).text()
    }
    console.log(data);
    return data;
}

async function storeData(data) {
    let client, db, coll;
    try {
        client = await MongoClient.connect(config.mongoUrl);
    }
    catch (error) {
        console.log(error)
        return
    }
    db = client.db(config.mongoDB);
    coll = db.collection(config.cneCollection);

    try {
        await coll.insertOne(data);
    }
    catch (error){
        console.log(error)
    }
    console.log('listo el pollo')
}

async function getCneUser(ci, nat){
    const data = await getCneData(ci, nat);
    if (data) {
        const key = `${nat}${ci}`
        data['_id'] = key;
        storeData(data);
    }
}

async function queueCneRequests(start, end){
    const queue = kue.createQueue();
    const nat = 'V';
    const cis = range.range(start, end);
    for (let ci of cis) {
        console.log(ci, nat);
        let job = await queue.create(
            'cneRequest',
            {
                'ci': ci,
                'nat': nat
            }
        ).attempts(5)
         .backoff({type:'exponential'})
         .removeOnComplete(true)
         .save()
    }
}

function getCiBoundaries() {
    commander.option('-s, --start [first_ci]', 'The first CI of the range')
             .option('-e, --end [last_ci]', 'The last CI of the range')
             .parse(process.argv)
    return {
        start: commander.start,
        end: commander.end
    }
}
const {start, end} = getCiBoundaries();
queueCneRequests(parseInt(start), parseInt(end))