const mongoose = require('mongoose');
const Joi = require('joi');
var bcrypt = require('bcrypt');
var moment = require('moment');

module.exports = [{
        method: 'POST',
        path: '/api/registration',
        handler: (req, h) => {
            h.type = 'application/json';
            var Utente = mongoose.model('Utente');
            return Utente.find({
                    Username: req.payload.username
                }).exec()
                .then((docs) => {
                    if (docs.length == 0) {
                        return bcrypt.genSalt(10).then((salt) => {
                            return bcrypt.hash(req.payload.psw, salt).then((pw) => {
                                return tokenGenerator().then(token => {
                                    var scadenza = expireDateGenerator();
                                    var newUtente = new Utente({
                                        Username: req.payload.username,
                                        Email: req.payload.email,
                                        Password: pw,
                                        Token: token,
                                        ScadenzaToken: scadenza,
                                        CreatedOn: Date.now(),
                                        Modified: Date.now(),
                                        Disabled: false,
                                    });
                                    return newUtente.save()
                                        .then((doc) => {
                                            return h.response(JSON.stringify({
                                                message: "successfully registrated",
                                                usertoken: token,
                                            })).code(200)
                                        })                                        
                                });
                            });
                        });
                    } else {
                        return h.response(JSON.stringify({
                            message: "duplicate username"
                        })).code(409);
                    }
                })
        },
        options: {
            cors: true,
            validate: {
                payload: {
                    username: Joi.string().required(),
                    psw: Joi.string().required(),
                    email: Joi.string().required(),
                },
            },
        }
    },
    {
        method: 'POST',
        path: '/api/login',
        handler: (req, h) => {
            h.type = 'application/json';
            var Utente = mongoose.model('Utente');
            return Utente.find({
                    Username: req.payload.username
                }).exec()
                .then((docs) => {
                    if (docs.length != 0) {
                        return bcrypt.compare(req.payload.psw, docs[0].Password).then((value) => {
                            if (value) {
                                return tokenGenerator().then(nuovoToken => {
                                    var newScadenza = expireDateGenerator();
                                    if (req.payload.devicetoken != undefined) {
                                        var Device = mongoose.model('Device');
                                        return Device.find({
                                                DToken: req.payload.devicetoken,
                                                UserId: docs[0]._id
                                            })
                                            .exec().then(devices => {
                                                if (devices.length != 0) {
                                                    var deviceName = devices[0].Name
                                                    return Utente.findOneAndUpdate({
                                                            _id: docs[0]._id
                                                        }, {
                                                            Token: nuovoToken,
                                                            ScadenzaToken: newScadenza
                                                        })
                                                        .exec().then((doc) => {                                                            
                                                            return h.response(JSON.stringify({
                                                                message: "successfully logged",
                                                                usertoken: nuovoToken,
                                                                changeduser: false,
                                                                devicename:deviceName,
                                                            })).code(200);
                                                        })
                                                } else {
                                                    return Utente.findOneAndUpdate({
                                                            _id: docs[0]._id
                                                        }, {
                                                            Token: nuovoToken,
                                                            ScadenzaToken: newScadenza
                                                        })
                                                        .exec().then((doc) => {
                                                            return Device.findOneAndUpdate({
                                                                    DToken: req.payload.devicetoken
                                                                }, {
                                                                    UserId: docs[0]._id
                                                                }).exec()
                                                                .then(() => {
                                                                    return h.response(JSON.stringify({
                                                                        message: "successfully logged",
                                                                        usertoken: nuovoToken,
                                                                        changeduser: true,
                                                                    })).code(200);
                                                                })

                                                        })
                                                }
                                            })
                                    } else {
                                        return Utente.findOneAndUpdate({
                                                _id: docs[0]._id
                                            }, {
                                                Token: nuovoToken,
                                                ScadenzaToken: newScadenza
                                            })
                                            .exec().then((doc) => {
                                                return h.response(JSON.stringify({
                                                    message: "successfully logged",
                                                    usertoken: nuovoToken,
                                                    changeduser: false
                                                })).code(200);
                                            })
                                    }


                                });

                            } else {
                                return h.response(JSON.stringify({
                                    message: "unauthorized"
                                })).code(401);
                            }
                        });
                    } else {
                        return h.response(JSON.stringify({
                            message: "unauthorized"
                        })).code(401);
                    }
                })
        },
        options: {
            cors: true,
            validate: {
                payload: {
                    username: Joi.string().required(),
                    psw: Joi.string().required(),
                    devicetoken: Joi.string().optional(),
                },
            },
        }
    },

]




var tokenGenerator = () => {
    return new Promise((resolve, reject) => {
        require('crypto').randomBytes(48, function (err, buffer) {
            var token = buffer.toString('hex');
            resolve(token);
        })
    })

}

//10 ore dura il token utente
var expireDateGenerator = () => {
    var data = moment();
    data.add(10, 'h')
    return data;
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
