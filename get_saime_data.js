const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;

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

async function getSaimeData(endpoint, ci, nat){
    try {
        const resp = await axios.post(
            endpoint,
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
    const url = `${config.cneUrlBase}?nacionalidad=${nat}&cedula=${ci}`
    try {
        const resp = await axios.get(url);
        console.log(resp.status);
        console.log(resp.data);
        return resp.data;
    }
    catch (error){
        console.log(error);
    }
}

async function storeData(ci, data) {
    let client, db, coll;
    try {
        client = await MongoClient.connect(config.mongoUrl);
    }
    catch (error) {
        console.log(error)
        return
    }
    db = client.db(config.mongoDB);
    coll = db.collection(config.mongoCollection);

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
    mongoCollection: 'saime',
    mongoDB: 'venez',

}

getSaimeData(config.saimeUrl, 3000000, 'V')
// getCneData(3000000, 'V')
// storeData(9000, {data:'some data'})