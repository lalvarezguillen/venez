const kue = require('kue');
const axios = require('axios');
const cheerio = require('cheerio');
const range = require('range');
const MongoClient = require('mongodb').MongoClient;
const config = require('./config')

const queue = kue.createQueue({
    redis: config.redisUrl,
});


/**
 * Queues scraping requests for a range of CIs, spaced over a period of time
 * to avoid overrunning the CNE "API"
 * @param {*} start 
 * @param {*} end 
 * @param {*} chunk 
 * @param {*} timeout 
 */
async function queueCneRequests(start, end, done){
    const nat = 'V';
    const cis = range.range(start, end);
    for (let ci of cis) {
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
    done()
}


/**
 * Async task that gets the information about an individual from CNE endpoints.
 * @param {*} ci 
 * @param {*} nat 
 * @param {*} done 
 */
async function getCneData(ci, nat, done) {
    const url = `${config.cneUrlBase}?nacionalidad=${nat}&cedula=${ci}`;
    const key = `${nat}${ci}`;
    const chromeAgent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 \
                        (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
    const requestConfig = {
        'headers': {
            'User-Agent': chromeAgent,
        }
    }
    try {
        const resp = await axios.get(url, requestConfig);
        if (resp.status != 200) {
            console.log(resp.status)
            done(new Error(resp.status))
        }
        const dom = cheerio.load(resp.data);
        if (isRegisteredInCne(dom)) {
            const parsedData =  parseCneData(dom);
            parsedData['_id'] = key;
            // console.log(parsedData);
            queueCneStore(parsedData);
        }
        else {
            const unregisteredData = {'_id': key}
            queueCneStore(unregisteredData);
            console.log(`unregistered: ${ci}`)
        }
        done()
    }
    catch (error){
        console.log(error.response.status, error.response.statusText);
        done(error)
    }
}

/**
 * Starts an async task that stores an individual's data on DB.
 * @param {*} data 
 */
function queueCneStore(data){
    const job = queue.create('cneStore', data)
                     .attempts(5)
                     .backoff({type:'exponential'})
                     .removeOnComplete( true )
                     .save()
}


/**
 * Extracts clues from the DOM to whether the individual was registered in CNE
 * @param {*} dom 
 */
function isRegisteredInCne(dom){
    return (
        !Boolean(dom('td').eq(11).text().match('no corresponde')) &&
        !Boolean(dom('td').eq(15).text().match('no se encuentra'))
    );
}


/**
 * Extracts an individual's info from the DOM.
 * @param {*} dom 
 */
function parseCneData(dom) {
    const cedula = dom('td').eq(11).text();
    const [cedula_letra, cedula_numero] = cedula.split('-')
    const data = {
        cedula_numero: parseInt(cedula_numero),
        cedula_letra: cedula_letra,
        nombre: dom('td').eq(13).text(),
        estado: dom('td').eq(15).text(),
        municipio: dom('td').eq(17).text(),
        parroquia: dom('td').eq(19).text(),
        centro: dom('td').eq(21).text(),
        direccion: dom('td').eq(23).text()
    }
    // console.log(data);
    return data;
}


/**
 * Aync task that stores the data of an individual on DB.
 * @param {*} data 
 * @param {*} done 
 */
async function storeData(data, done) {
    let db, coll;
    db = mongoClient.db(config.mongoDB);
    coll = db.collection(config.cneCollection);

    try {
        await coll.insertOne(data);
    }
    catch (error){
        console.log(error)
        done(error)
    }
    done()
}


var mongoClient;
/**
 * Starts consuming the tasks in the queue.
 */
async function runTasks(){
    try {
        mongoClient = await MongoClient.connect(config.mongoUrl);
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
    console.log('connected to Mongo. Starting to consume tasks...');
    queue.process('cneRequest', 5, async function(job, done){
        try {
            await getCneData(job.data.ci, job.data.nat, done);
        }
        catch (error){
            console.log(error)
        }
    });

    queue.process('cneStore', 3, async function(job, done){
        try {
            await storeData(job.data, done);
        }
        catch (error){
            console.log(error);
        }
    });

    queue.process('queueCneRequests', 1, async function(job, done){
        try {
            await queueCneRequests(job.data.start, job.data.end, done);
        }
        catch (error) {
            console.log(error);
        }
    });
}

runTasks();