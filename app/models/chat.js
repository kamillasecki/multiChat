var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var message = mongoose.Schema({
    user: String,
    message: String,
    createdOn: {type: Date, default: Date.now}
});



// define the schema for our user model
var chatSchema = mongoose.Schema({
    settings : {
        privacy : Boolean,
        participants : [{name:String}],
    },
    messages: [message]
}, {
    timestamps: true
});


// methods ======================


// create the model for users and expose it to our app
module.exports = mongoose.model('Chat', chatSchema);