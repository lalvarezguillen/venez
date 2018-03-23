const kue = require('kue');
const queue = kue.createQueue()


function printHello(job, done) {
    console.log('Hello')
    done()
}

function printWorld(job, done) {
    queue.create("printHello", {}).save()
    console.log("World")
    done()
}
queue.process("printHello", 5, printHello)
queue.process("printHelloWorld", 5, printWorld)