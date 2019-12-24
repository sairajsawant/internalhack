const Team = require('../models/Team.js')
const shortid = require('shortid');
const User = require('../models/User.js')
const sendMail = require('./account').sendMail
const readHTMLFile = require('./account').readHTMLFile
const handlebars = require('handlebars');
const firebase = require('firebase')
const fs = require('fs');

let submitsolution = function(req,res){
    console.log(req.body);
    
    const firebaseConfig = {
        apiKey: "AIzaSyAV62cd_auwNQLFaQQHDNuhVUKi-pEju0c",
        authDomasin: "ihack2020.firebaseapp.com",
        databaseURL: "https://ihack2020.firebaseio.com",
        projectId: "ihack2020",
        storageBucket: "ihack2020.appspot.com",
        messagingSenderId: "1028872299919",
        appId: "1:1028872299919:web:eb6fb9c4f1432b8b1d57fa",
        measurementId: "G-YP98MJXRY8"
    };
    firebase.initializeApp(firebaseConfig);
    // var storage = firebase.storage();
    // var storageRef = storage.ref();

    // var bucket = firebase.storage().bucket("my-custom-bucket");
    // bucket.child("TeamName/" + "PPtSolution").put(file)
    //             .then(function () {
    //                 console.log("Document successfully written!");
    //             })
    //             .catch(function (error) {
    //                 console.error("Error writing document: ", error);
    //             });

    res.json({"result " : 200})
}
let createteam = function (req, res) {
    let team_leaderid = req.body.team_leaderid;
    let team_name = req.body.team_name;
    const team_invitecode = shortid.generate();

    let namesearch = {
        team_name: team_name
    };
    Team.countDocuments(namesearch, (err, count) => {
        if (count != 0) {
            res.json({
                status: 0
            });
        } else {
            const new_team = new Team({
                _id: team_invitecode,
                team_leaderid: team_leaderid,
                team_name: team_name,
                team_invitecode: team_invitecode
            })
            new_team.team_members.push(team_leaderid)
            new_team.save()
                .then(() => {

                    let query = {
                        _id: team_leaderid
                    };
                    User.updateOne(query, {
                        is_teamleader: 'true',
                        is_inteam: 'true',
                        team_id: team_invitecode
                    }, function (err, affected, resp) {
                        return res.json({
                            status: 1,
                            team_invitecode: team_invitecode
                        });
                    })

                })
        }
    })
}


let jointeam = async function (req, res) {
    let reg_id = req.body.reg_id;
    let team_code = req.body.team_code;

    const filter = {
        _id: team_code
    };
    Team.findOne(filter).then(async (doc) => {
        if (!doc) {
            return res.json({
                status: 2
            });
        }
        const team_leaderid = doc.team_leaderid;
        const team_name = doc.team_name;
        console.log(doc.team_members.length, doc.team_leaderid)
        if (doc.team_members.length < 6) {
            const update = {
                $push: {
                    team_members: reg_id
                }
            };
            let doc = await Team.findOneAndUpdate(filter, update, {
                new: true
            });

            let query = {
                _id: reg_id
            };
            User.findOneAndUpdate(query, {
                is_inteam: 'true',
                team_id: team_code
            }, { new: true }, function (err, doc) {
                const joinedMember = doc.name
                User.findOne({ _id: team_leaderid }).then((team_leader) => {
                    console.log(team_leader.email, team_leader.name);
                    readHTMLFile('./public/teamjoinemail.html', function(err, html) {
                        var template = handlebars.compile(html);
                        var replacements = {
                            teamleader : team_leader.name,
                            teammember : joinedMember,
                            teamname : team_name
                        };
                        var htmlToSend = template(replacements);
                        var email = {
                            from: 'internalhack2020@gmail.com',
                            to: team_leader.email,
                            subject: joinedMember + ' Joined Team ' + team_name,
                            html: htmlToSend
                        };
                        sendMail(email); 
                    });

                })
                return res.json({
                    status: 1
                });
            })
        } else {
            return res.json({
                status: 0
            });
        }
    })
}

let removeteammember = async function (req, res) {
    let reg_id = req.body.reg_id;
    let team_code = req.body.team_code;

    const filter = {
        _id: team_code
    };
    const update = {
        $pull: {
            team_members: reg_id
        }
    };
    let doc = await Team.findOneAndUpdate(filter, update, {
        new: true
    });

    let query = {
        _id: reg_id
    };
    User.updateOne(query, {
        is_inteam: 'false',
        team_id: ''
    }, function (err, affected, resp) {
        return res.json({
            status: 1
        });
    })

}

let deletegroup = async function (req, res) {
    console.log("sasasasasasasas")
    let team_code = req.body.team_code;
    let reg_id = req.body.reg_id;
    User.findOne({
        _id: reg_id
    }).then((doc) => {
        const is_teamleader = doc.is_teamleader
        console.log(is_teamleader)
        const filter = {
            _id: team_code
        };
        if (is_teamleader) {
            Team.findOne(filter).then(
                (doc) => {
                    console.log(doc.team_members)
                    User.updateMany({
                        _id: {
                            $in: doc.team_members
                        }
                    }, {
                        $set: {
                            is_inteam: false,
                            team_id: '',
                            is_teamleader: false
                        }
                    }, {
                        multi: true
                    }).then(() => {
                        Team.deleteOne(filter).then(() => {
                            res.json({
                                status: 1
                            })
                        })
                    })
                }).catch((err) => console.log(err))
        } else {
            const update = {
                $pull: {
                    team_members: reg_id
                }
            };
            Team.findOneAndUpdate(filter, update, {
                new: true
            }).then(() => {
                User.findOneAndUpdate({
                    _id: reg_id
                }, {
                    is_inteam: false,
                    team_id: ''
                })
                    .then(() => res.json({
                        status: 1
                    }));

            });
        }
    })

}


module.exports = {
    createteam: createteam,
    jointeam: jointeam,
    removeteammember: removeteammember,
    deletegroup: deletegroup,
    submitsolution : submitsolution
  
}