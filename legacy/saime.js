
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