const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const cheerio = require('cheerio');
const delay = require('delay');
const range = require('range');
const kue = require('kue');

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

const config = {
    saimeUrl: 'https://tramites.saime.gob.ve/index.php?r=usuario/usuario/BuscarSaimeContacto',
    cneUrlBase: 'http://www.cne.gov.ve/web/registro_electoral/ce.php',
    mongoUrl: 'mongodb://localhost:27017',
    saimeCollection: 'saime',
    cneCollection: 'cne',
    mongoDB: 'venez',
}

async function getCneUser(ci, nat){
    const data = await getCneData(ci, nat);
    if (data) {
        const key = `${nat}${ci}`
        data['_id'] = key;
        storeData(data);
    }
}

function queueCneRequests(){
    const queue = kue.createQueue();
    const nat = 'V';
    const cis = range.range(19500001, 19500100);
    for (let ci of cis) {
        console.log(ci, nat);
        let job = queue.create(
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
// getSaimeData(3000000, 'V')
// getCneData(3000000, 'V')
// storeData(9000, {data:'some data'})
queueCneRequests()