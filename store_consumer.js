const MongoClient = require('mongodb').MongoClient;
const kue = require('kue');
const config = require('./config')


async function storeData(data, done) {
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