const secret = require('./secretKeys');

module.exports = {
    port: secret.main.port,
    mongo_settings: {
        name: secret.mongo.name,
        port: secret.mongo.port,
        secret: secret.mongo.secret
    },
    track_features: {
        key: false, // Either 0 or 1
        mode: false, // Either 0 or 1
        acousticness: true,
        danceability: true,
        energy: true,
        instrumentalness: true,
        liveness: false,
        loudness: false,
        speechiness: true,
        valence: true,
        tempo: false,
    },
    classification_config: {
        general: {
            cutTrainingPercentage: 90, // (1 - 100) - Percentage of training data (the rest will go towards the testing sample)
            grabMin: true, // Equalise the total number of tracks per genre from the lowest value overall.
            maxStrikes: 0, // Low as possible - How many strikes it takes for the program to delete the track from the training sample
            gapAllowance: 8, // (1 - 9) - How much gap the program has to offer
        },
        config: {
            binaryThresh: 0.5,
            activation: 'sigmoid',  // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
            inputSize: 7,
            inputRange: 7,
            hiddenLayers: [500, 500],
            outputSize: 7,
            learningRate: 0.03,
            decayRate: 0.999,
        },
        train: {
            iterations: 200000,    // the maximum times to iterate the training data --> number greater than 0
            errorThresh: 0.01,     // the acceptable error percentage from training data --> number between 0 and 1
            log: false,            // true to use console.log, when a function is supplied it is used --> Either true or a function
            logPeriod: 1,         // iterations between logging out --> number greater than 0 = DEFAULT 10
            learningRate: 0.01,    // scales with delta to effect training rate --> number between 0 and 1
            momentum: 0.1,         // scales with next layer's change value --> number between 0 and 1
            callback: null,        // a periodic call back that can be triggered while training --> null or function
            callbackPeriod: 10,    // the number of iterations through the training data between callback calls --> number greater than 0
            timeout: Infinity      // the max number of milliseconds to train for --> number greater than 0
        },
        predict: {
            binaryThresh: 0.99,
            hiddenLayers: [100, 100],     // array of ints for the sizes of the hidden layers in the network
            activation: 'sigmoid',  // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
            leakyReluAlpha: 0.999   // supported for activation type 'leaky-relu'
        },
    },
    recommendation_config: {
        activitiesMap: {
            Workout: ["Rock", "RnB", "ElectronicAndDance"],
            Party: ["Pop", "HipHop", "Rock", "ElectronicAndDance"],
            Focus: ["Jazz", "Classical", "Blues"],
            Sleep: ["Classical", "Blues"],
            Romance: ["Classical", "Blues", "Jazz"],
            Gaming: ["Rock", "RnB", "ElectronicAndDance"],
            Dinner: ["Chill", "Jazz", "Classical"],
            Travel: ["Pop", "HipHop", "RnB"],
            Relax: ["Chill", "Jazz", "Classical"]
        },
        genres: ["Rock", "RnB", "ElectronicAndDance", "Pop", "HipHop", "Jazz", "Classical", "Blues", "Chill"],
        activities: ["Workout", "Party", "Focus", "Sleep", "Romance", "Gaming", "Dinner", "Travel", "Relax"],
        maxLimitSelection: 45000,
        maxGenreSelection: 10000
    },
    spotify: {
        client_id: secret.spotify.client_id,
        client_secret: secret.spotify.client_secret,
        spotify_callback: secret.spotify.spotify_callback,
        scopes: ["user-read-private", "user-read-email", "user-library-read", "user-top-read", "user-read-playback-state", "playlist-modify-private", "playlist-modify-public"]
    },
    pushBullet: {
        api_token: secret.pushBullet.api_token
    },
    neo4j: {
        username: secret.neo4j.username,
        password: secret.neo4j.password,
        ip: secret.neo4j.ip,
        port: secret.neo4j.port
    },
    table_settings: {
        max_limit: 10
    },
    blacklist_options: {
        tick_interval: 30 // Seconds
    }
};