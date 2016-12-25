/*-----------------------------------------------------------------------------
This template demonstrates how to use Waterfalls to collect input from a user using a sequence of steps.
For a complete walkthrough of creating this type of bot see the article at
https://docs.botframework.com/en-us/node/builder/chat/dialogs/#waterfall
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var azure = require("azure-storage");

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
        if(session.userData.counter==0 || session.userData.counter == undefined)
        {
            session.userData.counter=0;
            session.userData.replies=[];
            session.userData.meta = require ('./questions.json');
        }
        if(session.userData.counter>0){
            var reply = new Object();
            reply.question = session.userData.lastAttribName;
            reply.answer = getSelectedOption(session.userData.meta.properties[reply.question],session.message.text);//get the answer number -- pass the question object it is reply.question
            session.userData.replies[session.userData.replies.length]=reply;
        }
        if(session.userData.counter==session.userData.meta.required.length){
            calculateRatings(session.userData.replies,session.userData.meta);
            sendToQueue(session.userData.replies);
            session.userData.replies=[];
            session.userData.counter=0;
            session.endConversation("Thanks for playing!");
            return;
        }
        if(session.userData.lastAttribName!="" && session.userData.lastAttribName != undefined){
            renderAfterMessage(session.userData.meta.properties[session.userData.lastAttribName],session);
        }
        renderImage(session.userData.meta.properties[session.userData.meta.required[session.userData.counter]],session);
        renderQuestion(session.userData.meta.properties[session.userData.meta.required[session.userData.counter]],builder,session);
        session.userData.lastAttribName=session.userData.meta.required[session.userData.counter];
        session.userData.counter++;
        next();
    }
]);
//send to queue when done
function sendToQueue(answers){
    var answerJSON = JSON.stringify(answers);
    var buffer = new Buffer (answerJSON);
    var toBase64 = buffer.toString('base64');
    var queueSvc = azure.createQueueService();
    queueSvc.createMessage(process.env['BOT_QUEUE_NAME'],toBase64,function(error, result, response){
  if(!error){
    // Message inserted
  }
});
}
//get the selected Options
function getSelectedOption(question, answer){
    if(question.type[0]=="number"){
        for(var ii=0;ii<question.Options.length;ii++){
            if(question.Options[ii]==answer)
                return ii+1;
        }
    }
    return answer;
}
//render image if we have one 
function renderImage(question,session){
    if(question.Describe.Image != undefined){
        var msg = new builder.Message(session)
            .attachments([{
                contentType: "image/jpeg",
                contentUrl: question.Describe.Image
            }]);
        session.endDialog(msg);
    }
}
//change UX to have selection and verify numbers
function renderQuestion(question,builder,session){
    //if question is number then get the object for the answers and load them 
    //if it is text just make it text
    if(question.Before!=undefined){
        session.send(question.Before[0].Message);        
    }
    if(question.type[0]=="number"){
         builder.Prompts.choice(session,question.Prompt.Patterns[0],question.Options);
    }
    if(question.type[0]=="string"){
        builder.Prompts.text(session,question.Prompt.Patterns[0]);
    }
}
//render after message
function renderAfterMessage(question,session){
    if(question.After!=undefined){
        session.send(question.After[0].Message);        
    }
}
//calculate score
function calculateRatings(answers,meta){
    //iterate the answers, check if it is a number, check the asnwer
    var rating=0;
    for(var ii=0;ii<answers.length;ii++){
        var question = meta.properties[answers[ii].question];
        if(question.type[0]=="number"){
            if(question.CorrectResponse==answers[ii].answer){
                rating++;
            }
        }
    }
    var reply = new Object();
    reply.question = "Rating";
    reply.answer = rating;
    answers[answers.length]=reply;
}

if (useEmulator) {
    var restify = require('restify');
    process.env['BOT_QUEUE_NAME']="bot-data-items";
    process.env['AZURE_STORAGE_CONNECTION_STRING']="DefaultEndpointsProtocol=https;AccountName=serverlessappstg;AccountKey=gWpyJCbVhiDDwV678zIUi244rDvYp0zjjSVF2akDAtrik+6D7qX6FR013ybEnp5CZmncIEMq6f1ef/+xRa71SA==;BlobEndpoint=https://serverlessappstg.blob.core.windows.net/;QueueEndpoint=https://serverlessappstg.queue.core.windows.net/;TableEndpoint=https://serverlessappstg.table.core.windows.net/;FileEndpoint=https://serverlessappstg.file.core.windows.net/;";
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}
