const mongoose = require('mongoose');
const Joi = require('joi');
var moment = require('moment')

module.exports = [{
    method: 'GET',
    path: '/api/getinfo',
    handler: (req, h) => {
        h.type = 'application/json';
        return isAuthenticated(req.query.utoken)
            .then(isLogged => {
                if (isLogged.status == true) {
                    var Device = mongoose.model('Device');
                        return Device.findOne({
                                UserId: isLogged.doc._id,
                                DToken: req.query.dtoken
                            }).exec()
                            .then( device =>
                                {
                                    if (device.length != 0) {
                                        return h.response(JSON.stringify({
                                            message: "Here we are",
                                            username: isLogged.doc.Username,
                                            devicename:device.Name,
                                        })).code(200);
                                    }
                                    else
                                    {
                                        return h.response(JSON.stringify({
                                            message: "unauthorized",
                                            cause: "token mismatch"
                                        })).code(401);
                                    }
                                });
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
            query: {
                utoken: Joi.string().required(),
                dtoken: Joi.string().required(),
            },
        },
    }
}, ]


var isAuthenticated = (token) => {
    return new Promise(resolve => {
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
                            doc: docs[0]
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