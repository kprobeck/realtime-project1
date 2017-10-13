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
    };
    
    socket.join('room1');
    
    socket.name = data.name;
    socket.timeStamp = data.timeStamp;
    
    // test to see if user logs in successfully
    console.log(`${socket.name} has successfully logged in`);
    
    io.sockets.in('room1').emit('userData', users);
    
    // start the game if 3 or more users joined
    let keysOfUsers = Object.keys(users);
    
    if(keysOfUsers.length >= 3) {
      console.log('Game Started!')
      currentUser = keysOfUsers[0];
      io.sockets.in('room1').emit('startGame', currentUser);
      io.sockets.in('room1').emit('userData', users); // to update/highlight the current user
    }
  });
};

const onMsg = (sock) => {
  const socket = sock;

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
    console.log('generating new prompt...');
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
    
    // if it is, award points, then update user data
    if(data.guess === currentPrompt) {
      users[data.userTimeStamp].points += 50;
      users[currentUser].points += 100;
      io.sockets.in('room1').emit('userData', users);
      socket.emit('correctGuess');
    }
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.leave('room1');
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
