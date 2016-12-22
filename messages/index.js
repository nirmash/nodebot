/*-----------------------------------------------------------------------------
This template demonstrates how to use Waterfalls to collect input from a user using a sequence of steps.
For a complete walkthrough of creating this type of bot see the article at
https://docs.botframework.com/en-us/node/builder/chat/dialogs/#waterfall
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

bot.dialog('/', [
    function (session, results, next) {
        if(session.userData.counter==0)
        {
            session.userData.replies="";
            session.userData.meta = require ('./questions.json');
        }
        if(session.userData.counter>0){
            session.userData.replies+=session.userData.lastAttribName +  ":" + session.message.text;
        }
        if(session.userData.counter==session.userData.meta.required.length){
            session.userData.counter=0;
            session.send("Thanks for playing!");
            session.endConversation();
            return;
        }
        builder.Prompts.number(session,session.userData.meta.properties[session.userData.meta.required[session.userData.counter]].Prompt.Patterns[0]);
        session.userData.lastAttribName=session.userData.meta.required[session.userData.counter];
        session.userData.counter++;
        next();
    }
]);

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}
