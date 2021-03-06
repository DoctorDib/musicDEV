const spotify = require('../helpers/spotifyApi.js');
const mongo = require('../helpers/mongo');

const trainer = require('../helpers/frontTraining');
const recommender = require('../helpers/musicTool/helpers/recommend');
const continuation = require('../helpers/musicTool/helpers/continuation');

const neo = require('../helpers/musicTool/helpers/neo4j');
const async = require('async');

const Axios = require('axios');
const config = require('../config/config');

const passportRefreshToken = require('passport-oauth2-refresh');


function grabNewToken (username, refresherToken, callback) {
    passportRefreshToken.requestNewAccessToken('spotify', refresherToken, {}, function (err, accessToken, refreshToken) {
        if (err) return console.log("Refresh Token error: ", err);
        let newRefreshToken = refreshToken == null ? refresherToken : refreshToken;

        console.log("New token: " + accessToken);
        spotify('setAccessToken', {username: username, access_token: accessToken});

        mongo('update', 'users', {identifier: {username: username}, data: {'spotify': {access_token: accessToken, refresh_token: newRefreshToken}}});
        callback();
    });
}

module.exports = function () {
    return {
        setRouting: function (router) {
            router.get('/currentSong', this.currentSong);
            router.get('/grabPlaylistGenre', this.grabPlaylistGenre);
            router.get('/grabActivePlaylist', this.grabActivePlaylist);
            router.get('/recommend', this.recommendingMusic);
            router.get('/initial', this.initialise);
            router.get('/managePlaylist', this.managePlaylist);
            router.get('/grabSavedPlaylists', this.grabSavedPlaylists);
            router.get('/clearHistory', this.clearHistory);
            router.get('/createPlaylist', this.createPlaylist);
            router.get('/deleteAccount', this.deleteAccount);

            router.post('/refreshToken', this.refreshToken);
        },

        deleteAccount: function(req, res) {
            if (req.query.name === req.user.id) {
                mongo('remove', 'users', { identifier: {id: req.user.id }});
                res.redirect('logout'); // TODO - DOES NOT SEEM TO REDIRECT FOR SOME UNKNOWN REASON...
            } else {
                res.json({success: false, error: "Could not validate"})
            }
        },
        createPlaylist: function(req, res) {
            mongo('grabOne', 'users', { identifier: {id: req.user.id } }, user => {
                spotify('createPlaylist', {username: req.user.id, playlistOptions: user.records.playlistOptions}, (resp) => {
                    console.log(resp)
                    let newPlaylistOptions = user.records.playlistOptions;
                    newPlaylistOptions.is_active = true;
                    newPlaylistOptions.id = resp.data.body.id;

                    mongo('update', 'users', {identifier: {id: req.user.id}, data: {playlistOptions: newPlaylistOptions}});
                    res.json({success: true, playlistOptions: newPlaylistOptions});
                });
            });
        },
        clearHistory: function(req, res) {
            mongo('update', 'users', { identifier: { id: req.user.id }, data: { history: []} } );
            res.json({success: true})
        },
        grabSavedPlaylists: function(req, res) {
            mongo('grabOne', 'users', { identifier: {id: req.user.id } }, user => {
                res.json({success: true, playlistOptions: user.records.playlistOptions});
            });
        },
        recommendingMusic: function(req, res) {
            let tmpGenres=[];
            let states = JSON.parse(req.query.genreStates);

            if (Object.keys(states).length) {
                // Grabs a list of active genres selected by the user.
                for (let index in states) {
                    if (states.hasOwnProperty(index)){
                        if (states[index]) {
                            tmpGenres.push(index);
                        }
                    }
                }
            } else {
                // Randomiser
                let randomGenre = Math.round(Math.random() * config.recommendation_config.activities.length);
                tmpGenres.push(config.recommendation_config.activities[randomGenre]);
            }

            const url = "http://"+config.neo4j.ip + ':' + config.neo4j.port;
            Axios.get(url)
                .then(() => {
                    spotify('grabToken', {username: req.user.id}, token => {
                        recommender(token, {user: req.user, genres: tmpGenres, username: req.user.id, musicQuantity: req.query.musicQuantity, savePlaylist: req.query.savePlaylist}, resp => {
                            mongo('grabOne', 'users', { identifier: {id: req.user.id } }, user => {
                                let tmp = user.records.history;

                                if (resp.successSongs.length) {
                                    let newHistory = {
                                        time: new Date().getTime(),
                                        songs: resp.successSongs
                                    };

                                    tmp = [newHistory, ...tmp];
                                    tmp = tmp.splice(0, config.table_settings.max_limit);
                                    mongo('update', 'users', { identifier: { id: req.user.id }, data: { history: tmp } } );
                                    res.json({success: true, resp: resp, history: tmp});
                                } else {
                                    console.log("Response: ", resp);
                                    res.json({success: false, resp: resp, history: tmp});
                                }
                            });
                        });
                    });
                })
                .catch(function(err){
                    console.log("Neo4j connection error: ", err);
                    res.json({success: false, error: err, function: `Failed to connect to ${url}`});
                });
        },
        currentSong: function(req, res) {
            spotify("grabCurrentMusic", {username: req.user.id}, data => {

                console.log(req.query)
                console.log(req.query.current)
                console.log(typeof req.query)

                console.log(">>", data.item.name)
                console.log(">>", req.query.current)

                if (data.item.name === req.query.current || !req.query.is_playing) {
                    res.json({
                        different: false,
                        isPlaying: data.is_playing,
                        song: data.item.name,
                        artist: data.item.artists[0].name,
                        image: data.item.album.images[0].url,
                    });
                } else {
                    continuation(req.user.id, data.item, response => {
                        if (response.success) {
                            let listenResponse = {
                                different: true,
                                isPlaying: data.is_playing,
                                song: data.item.name,
                                artist: data.item.artists[0].name,
                                image: data.item.album.images[0].url,
                                recommendedSong: response.hasOwnProperty('song'),
                            };

                            if(response.song.length) {
                                listenResponse.recommendedSong = response.song;

                                // Saving to database
                                mongo('grabOne', 'users', { identifier: {id: req.user.id } }, (resp) => {
                                    let newPlaylistOptions = resp.records.playlistOptions;
                                    newPlaylistOptions.savedTracks.push(response.song[0]);
                                    listenResponse.savedTracks = newPlaylistOptions.savedTracks;

                                    mongo('update', 'users', { identifier: { id: req.user.id }, data: { playlistOptions: newPlaylistOptions } } );
                                    console.log(listenResponse)
                                    res.json(listenResponse);
                                });
                            } else {
                                console.log("===============================")
                                res.json(listenResponse);
                            }
                        } else {
                            res.json({success: false, function: 'Continuation error'});
                        }
                    });
                }
            });
        },
        grabPlaylistGenre: function(req, res) {
            console.log("Grabbing playlist genres")
            mongo('update', 'users', { identifier: { id: req.user.id }, data: { activePlaylists: req.query.playlists } } );
            mongo('grabOne', 'users', { identifier: {id: req.user.id } }, (resp) => {
                trainer("grabURI", req.user.id, resp.records.spotify.access_token, req.query.playlists, () => {
                    console.log("DONE")
                    res.json({success: true});
                });
            });
        },
        grabActivePlaylist: function(req, res) {
            mongo('grabOne', 'users', { identifier: { id: req.user.id }, options: { activePlaylists: { $exists: true } } }, resp => {
                if (resp.records !== null) {
                    if (resp.records.activePlaylists !== null) {
                        res.json({
                            success: true,
                            playlists: resp.records.activePlaylists
                        });
                    }
                } else {
                    res.json({success: false});
                }
            });
        },
        initialise: function (req, res) {
            mongo('grabOne', 'musicMemory', {identifier: {id: "accuracy"}}, accuracyRecords => {
                spotify('new_user', {username: req.user.id}, () => {
                    mongo('grabOne', 'users', {identifier: {id: req.user.id}}, resp => {
                        // Automatically refresh on load
                        grabNewToken(req.user.id, resp.records.spotify.refresh_token, () => {
                            spotify('grabPlaylists', {
                                username: req.user.id,
                                access_token: resp.records.spotify.access_token
                            }, playlists => {
                                console.log(resp)
                                console.log(accuracyRecords.records.accuracy)
                                if (playlists.success) {
                                    res.json({
                                        success: true,
                                        userAccount: req.user,
                                        playlists: playlists.data,
                                        new_user: !resp.records.hasOwnProperty('playlist'),
                                        access_token: resp.records.spotify.access_token,
                                        privatePlaylist: resp.records.playlistOptions.is_private,
                                        playlistActive: resp.records.playlistOptions.is_active,
                                        playlistName: resp.records.playlistOptions.name,
                                        savedTracks: resp.records.playlistOptions.savedTracks || [],
                                        activePlaylists: resp.records.activePlaylists,
                                        accuracy: accuracyRecords.records.accuracy,
                                        history: resp.records.history || [],
                                    });
                                } else {
                                    console.log(req.user.id);
                                    console.log(resp.records);
                                    res.json({success: false});
                                }
                            });
                        });
                    });
                });
            });
        },
        refreshToken: function (req, res) {
            mongo('grabOne', 'users', {identifier: {username: req.user.id}}, resp => {
                grabNewToken(req.user.id, resp.records.spotify.refresh_token, function () {
                    res.redirect('/');
                });
            });
        },
        managePlaylist: function (req, res) {
            console.log("Managing playlist")
            let task = req.query.task;
            console.log(task)

            mongo('grabOne', 'users', { identifier: { id: req.user.id }, options: { playlistOptions: { $exists: true } } }, resp => {
                //console.log(resp)
                if (resp.records.playlistOptions.is_active) {
                    switch(task){
                        case 'clear':
                            console.log("Preparing to delete")
                            spotify("clearPlaylist", {username: req.user.id, playlistOptions: resp.records.playlistOptions}, data => {
                                let newPlaylistOptions = resp.records.playlistOptions;
                                newPlaylistOptions.savedTracks = [];
                                mongo('update', 'users', { identifier: { id: req.user.id }, data: { playlistOptions: newPlaylistOptions } } );
                                res.json(data);
                            });
                            break;
                        case 'change_option':
                            spotify("changePlaylistInformation", {username: req.user.id, new_changes: req.query.data, playlistOptions: resp.records.playlistOptions}, data => {
                                if(data.success){
                                    let newPlaylistOptions = resp.records.playlistOptions;
                                    newPlaylistOptions.name = data.new_name;
                                    newPlaylistOptions.is_private = data.is_private;
                                    mongo('update', 'users', { identifier: { id: req.user.id }, data: { playlistOptions: req.query.playlists } } );
                                    console.log("Changed")
                                    res.json(data);
                                }
                            });
                            break;
                        case 'delete':
                            try {
                                console.log("Preparing to delete playlist")
                                console.log(resp.records)
                                spotify("deletePlaylist", {username: req.user.id, playlistOptions: resp.records.playlistOptions}, data => {
                                    if(data.success){
                                        let newPlaylistOptions = resp.records.playlistOptions;
                                        newPlaylistOptions.name = 'MusicDEV Recommendation';
                                        newPlaylistOptions.id = '';
                                        newPlaylistOptions.is_private = true;
                                        newPlaylistOptions.is_active = false;
                                        mongo('update', 'users', { identifier: { id: req.user.id }, data: { playlistOptions: newPlaylistOptions } } );
                                        console.log("Delete playlist")
                                        res.json(data);
                                    }
                                });
                                break;
                            } catch(e) {
                                console.log(e)
                            }
                            break;
                        case 'deleteSingle':
                            console.log(req.query)
                            let uri = req.query.uri;
                            console.log(uri)
                            spotify("deletePlaylistTrack", {username: req.user.id, playlistOptions: resp.records.playlistOptions, uri:uri}, data => {
                                if(data.success){
                                    let savedTracks = resp.records.playlistOptions.savedTracks;
                                    let finalTracks = [];
                                    for (let index in savedTracks) {
                                        if (savedTracks.hasOwnProperty(index)) {
                                            if(savedTracks[index].id !== uri) {
                                                finalTracks.push(savedTracks[index]);
                                            }
                                        }
                                    }

                                    let newPlaylistOptions = resp.records.playlistOptions;
                                    newPlaylistOptions.savedTracks = finalTracks;

                                    mongo('update', 'users', { identifier: { id: req.user.id }, data: { playlistOptions: newPlaylistOptions } } );
                                    res.json({success: true, savedTracks: finalTracks});
                                } else {
                                    res.json({success: false, function: "Deleting single track"});
                                }
                            });
                            break;
                    }
                } else {
                    res.json({success: false, error: 'No playlist found...', function: 'Trying to change playlist settings'});
                }
            });
        }
    };
};
