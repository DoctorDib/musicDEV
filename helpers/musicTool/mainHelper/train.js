const brain = require('brain.js');
const config = require('../../../config/config');
const push = require('../helpers/pushbullet');

let error = 0, iteration = 'default';
let timerStart=0;

function timer (startTimer) {
    if (startTimer) {
        timerStart = 0;
        timerStart = new Date();
        return;
    }
    return (new Date() - timerStart) / 1000 + " seconds";
}

function logIt (data) {
    data = JSON.stringify(data);
    iteration = data.split("iterations:").pop().split(',')[0];
    error = data.split("error:").pop().replace('"', '');

    console.log("==================================")
    console.log("Iterations: " + iteration);
    console.log("Error: " + error);
    console.log("Duration: " + (new Date() - timerStart) / 1000 + " seconds")
}

module.exports = (SpotifyApi, dictionary, callback) => {
    timer(true);

    // OVERWRITING CONFIG
    let mainNetConfig = { };
    let mainTrainConfig = { log: logIt, };

    let netConfig = Object.assign(config.classification_config.config, mainNetConfig);
    console.log(netConfig);

    let trainConfig = Object.assign(config.classification_config.train, mainTrainConfig);
    console.log(trainConfig);

    let netsObject = new brain.NeuralNetwork(netConfig); // TODO - TEMP

    console.log("Training started:");
    netsObject.trainAsync(dictionary, trainConfig)
        .then(() => {
            // if( parseFloat(timer(false).match(/\d+.\d+/g)[0]) < 1 /*second*/) {
            //     setTimeout(function(){
            //         callback({error: true})
            //     }, 0)
            // } else {
            let bodyData = `Finished: \nError: ${error}\nIteration: ${iteration}\nTimer: ${timer(false)}`;
            push.send({ title: "Finished task", body: bodyData });
            netsObject = netsObject.toJSON();
            console.log("Finished and returning");
            callback({ training: netsObject, error: false });
            // }
        })
        .catch(err => {
            console.log(err);
        });
};
