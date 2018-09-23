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
                                if ((req.payload.btname != undefined && req.payload.wifiip != undefined) ||
                                    (req.payload.btname != undefined && req.payload.mobileip != undefined) ||
                                    (req.payload.wifiip != undefined && req.payload.mobileip != undefined)) {
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
                                        message: "At least two interface must be enabled",
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
}, ];

//TimeStamp più 15 minuti
var expireDateGenerator = () => {
    var data = moment();
    data.add(15, 'm')
    return data;
}


var tokenGenerator = () => {
    return new Promise((resolve, reject) => {
        require('crypto').randomBytes(3, function (err, buffer) {
            var token = buffer.toString('hex');
            resolve(token);
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