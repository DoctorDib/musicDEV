function check(outcome, callback) {
    let high = 0, highLabel;

    for (let index in outcome) {
        if(outcome.hasOwnProperty(index)){
            let tmpOut = outcome[index];
            if (tmpOut > high) {
                high = tmpOut;
                highLabel = index;
            }
        }
    }

    if (highLabel === undefined){
        console.log("EERRRRRROORRRR:")
        console.log(outcome)
        process.exit(1)
    }
    callback(highLabel);
}


module.exports = function (net, data, callback) {
    let outcome = net.run(data.features || data);
    console.log(outcome)
    check(outcome, (resp)=>{
        callback(resp)
    });
};