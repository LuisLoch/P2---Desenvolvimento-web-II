const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = 3000;

app.use(express.static('public'));

let players = {};
let currentTurn = 'X';
let board = ['', '', '', '', '', '', '', '', ''];

io.on('connection', (socket) => {
  //Se o jogo ainda não tiver dois jogadores para começar a partida
  if (Object.keys(players).length < 2) {
    if (Object.keys(players).length == 0){
      players[socket.id] = 'X'; //Na primeira vez que alguém se conectar, o currentTurn será X, portanto o socket.id será de 'X'. Depois disso o currentTurn se altera para 'O' para o próximo jogador
    } else if (Object.keys(players).length == 1) {
      players[socket.id] = 'O';
    }

    //Envia um 'playerAssignment' só para o cliente conectado
    io.to(socket.id).emit('playerAssignment', players[socket.id]);

    console.log(`Um jogador se conectou! Quantidade de jogadores: ${Object.keys(players).length}`);

    //Inicia o jogo se houverem dois jogadores
    if (Object.keys(players).length === 2) {
      board = ['', '', '', '', '', '', '', '', '']; //Limpa todas as posições da tabela
      io.emit('updateBoard', board); //Emite para todos os clientes um 'updateBoard' com a tabela vazia
      currentTurn = 'X';
      io.emit('nextTurn', currentTurn);
      io.emit('startGame');
      currentTurn = 'X';
    }
  } else {
    io.to(socket.id).emit('gameFull');
    socket.disconnect(true);
  }

  // Recebe o 'move' do cliente com o index da tabela e com o marcador do cliente
  socket.on("move", (data) => {
    // Verificar se é a vez do jogador atual
    if ((data.player === 'X' && currentTurn === 'X') || (data.player === 'O' && currentTurn === 'O')) {
      console.log(`O player ${data.player} clicou na posição ${data.index+1}.`);
      // Atualizar o estado do tabuleiro
      board[data.index] = data.player;

      // Alternar a vez do jogador
      currentTurn = currentTurn === 'X' ? 'O' : 'X';

      // Transmitir o movimento para todos os jogadores conectados
      io.emit("updateBoard", board);
      io.emit('nextTurn', currentTurn);
      console.log(`O player ${data.player} clicou na posição ${data.index+1}. Nova tabela ${board}. Turno agora é do jogador: ${currentTurn}.`);
    }
  });

  socket.on('iWin', (player) => {
    io.emit('gameOver', player);
    restart();
  });

  //Quando algum dos clientes clicar no botão de recomeçar, o servidor receberá o restart e enviará para os dois jogadores um reset, limpando todas as posições da tabela
  socket.on('restart', () => {
    restart();
    io.emit('gameRestarted');
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    console.log(`Um jogador se desconectou: ${players[socket.id]}. Quantidade de jogadores: ${Object.keys(players).length}.`);
  });

  function restart() {
    board = ['', '', '', '', '', '', '', '', '']; //Limpa todas as posições da tabela
    io.emit('updateBoard', board); //Emite para todos os clientes um 'updateBoard' com a tabela vazia
    currentTurn = 'X';
    io.emit('nextTurn', currentTurn);
  }
});

//Caso o cliente acesse a página principal, ele recebe o arquivo index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

//Servidor escutando a porta de número port
server.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port}.`);
});