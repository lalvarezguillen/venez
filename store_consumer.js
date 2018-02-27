const MongoClient = require('mongodb').MongoClient;

const config = {
    saimeUrl: 'https://tramites.saime.gob.ve/index.php?r=usuario/usuario/BuscarSaimeContacto',
    cneUrlBase: 'http://www.cne.gov.ve/web/registro_electoral/ce.php',
    mongoUrl: 'mongodb://localhost:27017',
    saimeCollection: 'saime',
    cneCollection: 'cne',
    mongoDB: 'venez',
}

async function storeData(data) {
    let client, db, coll;
    try {
        client = await MongoClient.connect(config.mongoUrl);
    }
    catch (error) {
        console.log(error)
        done(error)
    }
    db = client.db(config.mongoDB);
    coll = db.collection(config.cneCollection);

    try {
        await coll.insertOne(data);
    }
    catch (error){
        console.log(error)
        done(error)
    }
    console.log('listo el pollo')
    done()
}

function runTasks(){
    const queue = kue.createQueue();
    queue.process('cneStore', 5, async function(job, done){
        try {
            await storeData(job.data, done);
        }
        catch (error){
            console.log(error)
        }
    });
}

runTasks();