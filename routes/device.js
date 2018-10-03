const mongoose = require('mongoose');
const Joi = require('joi');
var moment = require('moment');


module.exports = [{
    method: 'POST',
    path: '/api/device/add',
    handler: (req, h) => {
        h.type = 'application/json';
        return isAuthenticated(req.payload.utoken)
            .then(isLogged => {
                if (isLogged.status == true) {
                    var Device = mongoose.model('Device');
                    return Device.find({
                            UserId: isLogged.id_user,
                            Name: req.payload.devicename
                        }).exec()
                        .then(docs => {
                            if (docs.length == 0) {
                                return tokenGenerator().then(token => {
                                    var newDevice = new Device({
                                        UserId: isLogged.id_user,
                                        Name: req.payload.devicename,
                                        Is_Pc: false,
                                        Status: false,
                                        DToken: token,
                                        CreatedOn: Date.now(),
                                        Modified: Date.now(),
                                        Disabled: false,
                                    })
                                    return newDevice.save()
                                        .then((doc) => {
                                            return h.response(JSON.stringify({
                                                message: "device added",
                                                devicetoken: token,
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
                                    message: "duplicate device name",
                                })).code(409);
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
                devicename: Joi.string().required()
            },
        },
    }
}, {
    method: 'GET',
    path: '/api/device/getall',
    handler: (req, h) => {
        h.type = 'application/json';
        return isAuthenticated(req.query.usertoken)
            .then(isLogged => {
                if (isLogged.status == true) {
                    var UserId = isLogged.id_user;
                    var Device = mongoose.model('Device');
                    return Device.find({
                        UserId: UserId
                    },'Name Is_Pc Status').exec().then(devices => {
                        return h.response(JSON.stringify({
                            message: "Here we are",
                            devices: devices
                        })).code(200);
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
            query: {
                usertoken: Joi.string().required(),
            },
        },
    }
}, {
    method: 'GET',
    path: '/api/test',
    handler: (req, h) => {
        h.type = 'application/json';

        return h.response(JSON.stringify({
           message:req.info.remoteAddress
        })).code(200);
    },
    options: {
        cors: true,
    }
} ];


var tokenGenerator = () => {
    return new Promise((resolve, reject) => {
        require('crypto').randomBytes(48, function (err, buffer) {
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