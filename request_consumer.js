const kue = require('kue');
const axios = require('axios');
const cheerio = require('cheerio');
const MongoClient = require('mongodb').MongoClient;

const config = {
    saimeUrl: 'https://tramites.saime.gob.ve/index.php?r=usuario/usuario/BuscarSaimeContacto',
    cneUrlBase: 'http://www.cne.gov.ve/web/registro_electoral/ce.php',
    mongoUrl: 'mongodb://localhost:27017',
    saimeCollection: 'saime',
    cneCollection: 'cne',
    mongoDB: 'venez',
}

async function getCneData(ci, nat, done) {
    const url = `${config.cneUrlBase}?nacionalidad=${nat}&cedula=${ci}`;
    const key = `${nat}${ci}`;
    try {
        const resp = await axios.get(url);
        if (resp.status != 200) {
            done(new Error(resp.status))
        }
        const dom = cheerio.load(resp.data);
        if (isRegisteredInCne(dom)) {
            const parsedData =  parseCneData(dom);
            parsedData['_id'] = key;
            console.log(parsedData);
            queueCneStore(parsedData);
        }
        done()
    }
    catch (error){
        console.log(error);
        done(error)
    }
}

function queueCneStore(data){
    const queue = kue.createQueue();
    const job = queue.create('cneStore', data)
                     .attempts(5)
                     .backoff({type:'exponential'})
                     .removeOnComplete(true)
                     .save()
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

function runTasks(){
    const queue = kue.createQueue();
    queue.process('cneRequest', 5, async function(job, done){
        try {
            await getCneData(job.data.ci, job.data.nat, done);
        }
        catch (error){
            console.log(error)
        }
    });
}

runTasks();