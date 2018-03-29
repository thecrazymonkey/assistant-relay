'use strict'

const path = require('path');
const express = require('express');
const GoogleAssistant = require('google-assistant');
const GRConfig = require('./config.json');
const readline = require('readline');
const async = require('async');

const authKeys = GRConfig.users;

const config = {
  conversation: {
    lang: GRConfig.language,
  },
  users: {},
  ip: GRConfig.ip,
  port: GRConfig.port,
  assistants: {}
}

const defaultAudio = false;
let returnAudio;
let assistant;

if(Object.keys(authKeys).length === 0){
  return console.log('No users configured, exiting..');
}

Object.keys(authKeys).forEach(function(k){
  config.users[k] = {};
  config.users[k].keyFilePath = path.resolve(__dirname, `${authKeys[k]}`);
  config.users[k].savedTokensPath = path.resolve(__dirname, `${k}-tokens.json`);
})

const app = express()
app.use(express.static(path.join(__dirname, 'xml')));
app.use(express.static(path.join(__dirname, 'audio')));

// Endpoint API
app.post('/custom', function (req, res) {
  const converse = req.query.converse;
  const command = req.query.command;
  const user = req.query.user;

  if(converse) returnAudio = true;

  sendTextInput(command, user)
  res.status(200).json({
      message: `Custom command executed`,
      command: `${command}`
  });

})

app.post('/customBroadcast', function (req, res) {
  const converse = req.query.converse;
  const command = req.query.text;
  const user = req.query.user

  if(converse) returnAudio = true;

  sendTextInput(`broadcast ${command}`, user);

  res.status(200).json({
      message: `Custom broadcast command executed`,
      command: `broadcast ${command}`
   });
})

app.post('/nestStream', function (req, res) {
  if(req.query.converse) returnAudio = true;

  if(req.query.stop) {
      sendTextInput(`Stop ${req.query.chromecast}`);

      res.status(200).json({
          message: `Nest stream command executed`,
          command: `Stop ${req.query.chromecast}`
      });
  }

  if(!checkUser(req.query.user)) {
    console.log(`User ${req.query.user} not found.  Cannot execute request`);
    return res.status(400).json({
         message: `User not found. Who is ${req.query.user}?`,
         command: `Show ${req.query.camera} on ${req.query.chromecast} | User: ${req.query.user}`
    });
  }

  sendTextInput(`Show ${req.query.camera} on ${req.query.chromecast}`, req.query.user)
  res.status(200).json({
      message: `Nest stream command executed`,
      command: `Show ${req.query.camera} on ${req.query.chromecast}`
  });
})

app.post('/broadcast', function (req, res) {

  const preset = req.query.preset;
  const user = req.query.user;

  if(req.query.converse) returnAudio = true;

  if(!checkUser(user)) {
    console.log(`User ${user} not found.  Cannot execute request`);
    return res.status(400).json({
        message: `User not found. Who is ${user}?`,
        command: `Preset: ${preset} | User: ${user}`
    });
  }

  switch(preset) {
      case 'wakeup':
          sendTextInput(`broadcast wake up everyone`, user);
          break;
      case 'breakfast':
          sendTextInput(`broadcast breakfast is ready`, user);
          break;
      case 'lunch':
          sendTextInput(`broadcast it's lunch time`, user);
          break;
      case 'dinner':
          sendTextInput('broadcast dinner is served', user);
          break;
      case 'timetoleave':
          sendTextInput(`broadcast its time to leave`, user);
          break;
      case 'arrivedhome':
          sendTextInput(`broadcast i'm home`, user);
          break;
      case 'ontheway':
          sendTextInput(`broadcast i'm on the way`, user);
          break;
      case 'movietime':
          sendTextInput(`broadcast the movie is about to start`, user);
          break;
      case 'tvtime':
          sendTextInput(`broadcast the show is about to start`, user);
          break;
      case 'bedtime':
          sendTextInput(`broadcast we should go to bed`, user);
          break;
      default:
          sendTextInput(`broadcast you selected a preset broadcast, but didn't say which one`, user);
    }

    res.status(200).json({
          message: `Predefined command executed`,
          command: `${req.query.preset}`
   });
})

//Start Express Web Server
app.listen({ host:config.ip, port:config.port}, () => console.log('Firing up the Web Server for communication on host:port '+ config.ip+':'+config.port))

let users;
let numberUsers = Object.keys(config.users).length;

if( numberUsers > 1){
  Object.keys(config.users).forEach(function(i, idx, array){
    if(idx === 0){
      return users = `${i} `
    }
    if (idx === array.length - 1){
      return users = users + `and ${i}`
    } else {
      users = users + `${i} `
    }
  })
} else {
  Object.keys(config.users).forEach(i => {
     users = i
  })
}

async.forEachOfLimit(config.users, 1, function(i, k, cb){
  let auth = i;
  config.assistants[k] = new GoogleAssistant(i)
  let assistant = config.assistants[k];
  assistant.on('ready', () => cb());
  assistant.on('error', (e) => {
      console.log(`Assistant Error when activating user ${k}. Trying next user`);
      return cb();
  })
}, function(err){
  if(err) return console.log(err.message);
	  //console.log('running')
    sendTextInput(`broadcast Assistant Relay is now setup and running for ${users}`)
})

function checkUser(user) {
  const users = Object.keys(GRConfig.users);
  return users.includes(user)
}


//Assistant Integration

function startConversation(conversation) {
  conversation
    //.on('audio-data', data => console.log('Got some audio data'))
    .on('response', (text) => {
      if (text) {
        console.log('Google Assistant:', text)
        var newLineSplit = text.split("\n")
      // Ignore lines if Assistant responds with extra interactive data (such as a "See More" web URL)
        if (newLineSplit.length > 1) text = newLineSplit[0]
        if(returnAudio) {
          //console.log(`sendTextInput ${text}`)
          sendTextInput(`broadcast ${text}`);
          returnAudio = defaultAudio;
        }

      }  
    })
   //.on('volume-percent', percent => console.log('New Volume Percent:', percent))
   //.on('device-action', action => console.log('Device Action:', action))
    .on('ended', (error, continueConversation) => {
      if (error) {
        console.log('Conversation Ended Error:', error);
      } else if (continueConversation) {
        //console.log('Support for Actions on Google are not yet supported by Assistant Relay');
        conversation.end();
      } else {
        console.log('Conversation Complete');
        conversation.end();
      }
    })
    .on('error', (error) => {
      console.log('Conversation Error:', error);
    });
}

function sendTextInput(text, n) {
  console.log(`Received command ${text}`);

  assistant = Object.keys(config.assistants)[0];
  assistant = config.assistants[`${assistant}`];

  config.conversation.textQuery = text;
  if(n) {
    n = n.toLowerCase();
    console.log(`User specified was ${n}`)
    assistant = config.assistants[`${n}`]
  } else {
    console.log(`No user specified, using ${Object.keys(config.assistants)[0]}`)
  }

  assistant.start(config.conversation, startConversation);
}
