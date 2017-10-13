const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/index.html`);

const prompts = ['An Apple', 'A Monkey', 'A Car', 'Nuclear Physics', 'A Plane', 'A Horse', 'A Goose', 'A Computer',
  'A Bottle of Root Beer', 'Waves', 'Pirates', 'A Superhero', 'Lightbulbs', 'A one-eyed Monster',
  'A Corkscrew', 'An Xbox Controller', 'Sunglasses', 'Rats', 'Cheese', 'Spooky Scary Skeletons', 'A Printer', 'A Pencil',
  'A Server', 'A Waiter', 'Movies Tickets', 'Popcorn', 'Hot Dogs', 'A Dance Performance', 'The entire Map of Skyrim', 'Old-Timey Cartoons',
  'Memes', 'A Chicken'];

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

  socket.on('join', () => {
    socket.join('room1');
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
    const randomPrompt = Math.floor(Math.random() * prompts.length);

    const data = {
      prompt: prompts[randomPrompt],
    };

    socket.emit('newPrompt', data);
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
