const mongoose = require('mongoose');
const Joi = require('joi');
var moment = require('moment');


module.exports = [{
        method: 'POST',
        path: '/api/session/new',
        handler: (req, h) => {
            h.type = 'application/json';
            return isAuthenticated(req.payload.utoken)
                .then(isLogged => {
                    if (isLogged.status == true) {
                        var Device = mongoose.model('Device');
                        return Device.findOne({
                                UserId: isLogged.id_user,
                                DToken: req.payload.dtoken
                            }).exec()
                            .then(device => {
                                if (device.length != 0) {
                                    if (req.payload.btname != undefined || req.payload.wifiip != undefined || req.payload.mobileip != undefined){
                                        var Session = mongoose.model('Session');
                                        return tokenGenerator().then(token => {
                                            var timestamp = expireDateGenerator();
                                            return Session.findOneAndUpdate({
                                                    ID_RECEIVING_DEVICE: device._id,
                                                }, {
                                                    CODE: token,
                                                    TIMESTAMP: timestamp,
                                                    WIFI: req.payload.wifiip,
                                                    BLUETOOTH: req.payload.btname,
                                                    MOBILE: req.payload.mobileip,
                                                    CreatedOn: Date.now(),
                                                    Modified: Date.now(),
                                                    Disabled: false,
                                                }, {
                                                    upsert: true
                                                }).exec().then((doc) => {
                                                    return h.response(JSON.stringify({
                                                        message: "session created",
                                                        sessioncode: token,
                                                    })).code(200)
                                                })
                                                .catch((err) => {
                                                    return h.response(JSON.stringify({
                                                        error: err
                                                    })).code(400)
                                                });
                                        });
                                    } else {
                                        return h.response(JSON.stringify({
                                            message: "At least one interface must be enabled",
                                        })).code(400);
                                    }

                                } else {
                                    return h.response(JSON.stringify({
                                        message: "token mismatch",
                                    })).code(401);
                                }
                            })
                    } else {
                        return h.response(JSON.stringify({
                            message: "unauthorized",
                            cause: "user token expired"
                        })).code(401);
                    }

                })

        },
        options: {
            cors: true,
            validate: {
                payload: {
                    utoken: Joi.string().required(),
                    dtoken: Joi.string().required(),
                    btname: Joi.string().optional(),
                    wifiip: Joi.array().optional(),
                    mobileip: Joi.boolean().optional(),
                },
            },
        }
    },
    {
        method: 'POST',
        path: '/api/session/connect',
        handler: (req, h) => {
            h.type = 'application/json';
            return isAuthenticated(req.payload.utoken)
                .then(isLogged => {
                    if (isLogged.status == true) {
                        var Device = mongoose.model('Device');
                        return Device.findOne({
                                UserId: isLogged.id_user,
                                DToken: req.payload.dtoken
                            }).exec()
                            .then(device => {
                                if (device.length != 0) {
                                    var Session = mongoose.model('Session');
                                    return Session.findOneAndRemove({
                                        CODE: req.payload.sessioncode,
                                    }).exec().then((doc) => {
                                        if (doc != null) {
                                            if (device._id != doc.ID_RECEIVING_DEVICE) {
                                                return Device.findOne({_id:doc.ID_RECEIVING_DEVICE}).exec()
                                                        .then( device_ricevente =>
                                                            {
                                                                if(doc.MOBILE==true)
                                                                    global.connections['java_server'].send(JSON.stringify({ricevente:device_ricevente.DToken,mittente:req.payload.dtoken}));  
                                                                return h.response(JSON.stringify({
                                                                    message: "session found",
                                                                    btname: doc.BLUETOOTH,
                                                                    wifiip: doc.WIFI,
                                                                    mobileip: doc.MOBILE,
                                                                })).code(200)
                                                            })
                                                                                              
                                                
                                            } else {
                                                return h.response(JSON.stringify({
                                                    message: "unauthorized",
                                                    cause: "same device",
                                                })).code(401)
                                            }

                                        } else {
                                            return h.response(JSON.stringify({
                                                message: "unauthorized",
                                                cause: "invalid session code",
                                            })).code(401)
                                        }

                                    })
                                } else {
                                    return h.response(JSON.stringify({
                                        message: "unauthorized",
                                        cause: "token mismatch",
                                    })).code(401);
                                }
                            })
                    } else {
                        return h.response(JSON.stringify({
                            message: "unauthorized",
                            cause: "user token expired"
                        })).code(401);
                    }

                })

        },
        options: {
            cors: true,
            validate: {
                payload: {
                    utoken: Joi.string().required(),
                    dtoken: Joi.string().required(),
                    sessioncode: Joi.string().required(),
                },
            },
        }
    },
];




//TimeStamp più 15 minuti
var expireDateGenerator = () => {
    var data = moment();
    data.add(15, 'm')
    return data;
}


//SESSION CODE 
var tokenGenerator = () => {
    var Session = mongoose.model('Session');
    return new Promise(resolvee => {
            var token = Math.floor(100000 + Math.random() * 900000);

            new Promise(resolve => {
                Session.find({
                    CODE: token
                }).exec().then(doc => {
                    if (doc.length == 0)
                        resolve(token);
                    else
                        resolve(null);

                })
            }).then(val => {
                if (val != null)
                    resolvee(val);
                else
                    resolvee(tokenGenerator());
            })
        
    })

}



var isAuthenticated = (token) => {
    return new Promise((resolve, reject) => {
        if (token == undefined) {
            resolve({
                status: false
            });
        } else {
            var Utente = mongoose.model('Utente');
            Utente.find({
                Token: token
            }).exec().then(docs => {
                if (docs.length != 0) {
                    var expireDate = docs[0].ScadenzaToken;
                    var date = moment();
                    if (moment(date).isAfter(expireDate))
                        resolve({
                            status: false
                        })
                    else
                        resolve({
                            status: true,
                            id_user: docs[0]._id
                        })
                } else {
                    resolve({
                        status: false
                    });
                }

            })

        }
    });
}