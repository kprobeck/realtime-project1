const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/index.html`);

const prompts = ['Apple', 'Monkey', 'Car', 'Nuclear Physics', 'Plane', 'Horse', 'Goose', 'Computer',
  'Bottle of Root Beer', 'Waves', 'Pirates', 'Superhero', 'Lightbulb', 'one-eyed Monster',
  'Corkscrew', 'Controller', 'Sunglasses', 'Rats', 'Cheese', 'Spooky Scary Skeletons', 'Printer', 'Pencil',
  'Server', 'Waiter', 'Movies Tickets', 'Popcorn', 'Hot Dogs', 'Dance Performance', 'The entire Map of Skyrim', 'Old-Timey Cartoons',
  'Memes', 'Chicken'];

const users = {};
let currentUser;
let currentPrompt;
let countDown = 30;
let allReady = false;
let gameStarted = false;

const onRequest = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write(index);
  res.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1 ${port}`);

// pass in the http server into socketio and grab websocket as io
const io = socketio(app);

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    users[data.timeStamp] = {
      name: data.name,
      points: 0,
      ready: false,
    };
    
    socket.join('room1');
    
    socket.name = data.name;
    socket.timeStamp = data.timeStamp;
    
    // test to see if user logs in successfully
    console.log(`${socket.name} has successfully logged in`);
    
    io.sockets.in('room1').emit('userData', users);
  });
};

const onMsg = (sock) => {
  const socket = sock;
  
  // check off if all users are ready to go
  socket.on('readyUp', (data) => {
    users[data.userTimeStamp].ready = data.ready;
    
    // check to see if everyone is ready
    
    // start the game if 3 or more users joined AND everyone is ready
    let keysOfUsersForReady = Object.keys(users);
    
    // check to see if all users are ready
    for (let i = 0; i < keysOfUsersForReady.length; i++){
      if(!users[keysOfUsersForReady[i]].ready){
        allReady = false;
        break;
      } else {
        allReady = true;
      }
    }
    
    // ONLY START THE GAME IS NOT ALREADY STARTED
    if(keysOfUsersForReady.length >= 3 && allReady && !gameStarted) {
      currentUser = keysOfUsersForReady[0];
      io.sockets.in('room1').emit('startGame', currentUser);
      io.sockets.in('room1').emit('userData', users); // to update/highlight the current user
      io.sockets.in('room1').emit('allReady');
      
      // every second, the coundown timer will decrease by 1, when it hits 0 it will go to the next user to draw
      gameStarted = true;
      setInterval( () => {
        countDown--;
        io.sockets.in('room1').emit('getCountDown', countDown);
        
        if(countDown === 0) {
        // get all the users, then cycle to the next one
        let keysOfUsers = Object.keys(users);
        
        for (let i = 0; i < keysOfUsers.length; i++){
          if(currentUser < keysOfUsers[i]){
            currentUser = keysOfUsers[i];
            break;
          } else if (currentUser == keysOfUsers[keysOfUsers.length - 1]) {
            currentUser = keysOfUsers[0];
            break;
          }
        }
    
        io.sockets.in('room1').emit('startRound', currentUser);
        io.sockets.in('room1').emit('userData', users); // to update/highlight the current user
        io.sockets.in('room1').emit('eraseCanvas');
        countDown = 30;
        }
      }, 1000);
    }
  });

  // create an image from data received
  socket.on('draw', (data) => {
    socket.broadcast.emit('drawToCanvas', data);
  });

  // erase the canvas
  socket.on('clearCanvas', () => {
    socket.broadcast.emit('eraseCanvas');
  });

  // give a random prompt from the prompt list
  socket.on('getPrompt', () => {
    const randomPrompt = Math.floor(Math.random() * prompts.length);

    const data = {
      prompt: prompts[randomPrompt],
    };

    currentPrompt = data.prompt;
    socket.emit('newPrompt', data);
    socket.broadcast.emit('guessThePrompt');
  });
  
  // see if the guess is correct
  socket.on('guessSent', (data) => {
    
    // make guess and prompt lowercase
    let guessLower = data.guess.toLowerCase();
    let promptLower = currentPrompt.toLowerCase(); 
    
    // if it is a correct guess, award points, then update user data
    if(guessLower === promptLower) {
      users[data.userTimeStamp].points += 50;
      users[currentUser].points += 100;
      io.sockets.in('room1').emit('userData', users);
      socket.emit('correctGuess');
      io.sockets.in('room1').emit('correctGuessAll', data.userTimeStamp);
    } else { // if wrong, just send their message to the chat box
      io.sockets.in('room1').emit('incorrectGuessAll', data);
    }
  });
};

const onDisconnect = (sock) => {
  const socket = sock;
  
  delete users[socket.timeStamp];
  io.sockets.in('room1').emit('userData', users);

  socket.leave('room1');
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
