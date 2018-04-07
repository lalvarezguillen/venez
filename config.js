const config = {
    saimeUrl: 'https://tramites.saime.gob.ve/index.php?r=usuario/usuario/BuscarSaimeContacto',
    cneUrlBase: 'http://www.cne.gov.ve/web/registro_electoral/ce.php',
    mongoUrl: `mongodb://${process.env.MONGO_HOST}`,
    saimeCollection: 'saime',
    cneCollection: 'cne',
    mongoDB: 'venez',
    redisUrl: `redis://${process.env.REDIS_HOST}`,
    apiHost: '0.0.0.0',
    apiPort: parseInt(process.env.API_PORT),
    proxyHost: process.env.PROXY_HOST,
    proxyPort: process.env.PROXY_PORT,
}

module.exports = config;