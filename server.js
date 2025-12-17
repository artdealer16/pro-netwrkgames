'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));
const io = socketIO(server);

// ====== CONSTANTS ======
const CANVAS_W = 800;
const CANVAS_H = 600;
const PADDLE_W = 20;
const PADDLE_H = 100;
const BALL_SIZE = 20; // Diameter
const BALL_SPEED = 8;

const rooms = {}; 

// ====== GAME LOGIC ======

function createGame(roomName) {
    return {
        roomName: roomName,
        players: {}, // { socketId: 1 or 2 }
        scores: { p1: 0, p2: 0 },
        active: false,
        // Game Objects
        p1: { x: 30, y: CANVAS_H/2 - PADDLE_H/2, score: 0 },
        p2: { x: CANVAS_W - 50, y: CANVAS_H/2 - PADDLE_H/2, score: 0 },
        ball: { 
            x: CANVAS_W/2, 
            y: CANVAS_H/2, 
            vx: 0, 
            vy: 0 
        }
    };
}

function resetBall(game, scorer) {
    game.ball.x = CANVAS_W / 2;
    game.ball.y = CANVAS_H / 2;
    
    // Send ball towards the player who lost (or random)
    const dirX = scorer === 1 ? 1 : -1;
    const dirY = (Math.random() * 2 - 1); // Random Y angle
    
    game.ball.vx = dirX * BALL_SPEED;
    game.ball.vy = dirY * BALL_SPEED;
}

function updateGame(game) {
    if (!game.active) return;

    // 1. Move Ball
    game.ball.x += game.ball.vx;
    game.ball.y += game.ball.vy;

    // 2. Wall Collisions (Top/Bottom)
    if (game.ball.y <= 0 || game.ball.y + BALL_SIZE >= CANVAS_H) {
        game.ball.vy *= -1; // Bounce
    }

    // 3. Paddle Collisions (Simple AABB Logic)
    // Check Player 1
    if (checkCollision(game.ball, game.p1)) {
        game.ball.vx = Math.abs(game.ball.vx); // Force move right
        game.ball.vx *= 1.05; // Slight speed up
    }
    // Check Player 2
    if (checkCollision(game.ball, game.p2)) {
        game.ball.vx = -Math.abs(game.ball.vx); // Force move left
        game.ball.vx *= 1.05; // Slight speed up
    }

    // 4. Scoring
    if (game.ball.x < 0) {
        game.scores.p2++;
        io.to(game.roomName).emit('scoreUpdate', game.scores);
        resetBall(game, 2);
    } else if (game.ball.x > CANVAS_W) {
        game.scores.p1++;
        io.to(game.roomName).emit('scoreUpdate', game.scores);
        resetBall(game, 1);
    }
}

function checkCollision(ball, paddle) {
    return (ball.x < paddle.x + PADDLE_W &&
            ball.x + BALL_SIZE > paddle.x &&
            ball.y < paddle.y + PADDLE_H &&
            ball.y + BALL_SIZE > paddle.y);
}

// ====== SERVER LOOP (60 FPS) ======
setInterval(() => {
    Object.keys(rooms).forEach(roomName => {
        const game = rooms[roomName];
        updateGame(game);
        
        // Send State
        io.to(roomName).emit('gameState', {
            p1: game.p1,
            p2: game.p2,
            ball: game.ball
        });
    });
}, 1000 / 60);

// ====== SOCKET HANDLERS ======
io.on('connection', (socket) => {

    socket.on('joinRoom', ({ room }) => {
        if (!rooms[room]) {
            rooms[room] = createGame(room);
        }
        const game = rooms[room];

        // Assign Role
        let role = 0;
        const currentPlayers = Object.values(game.players);
        
        if (!currentPlayers.includes(1)) role = 1;
        else if (!currentPlayers.includes(2)) role = 2;
        else {
            socket.emit('roomFull', 'Room is full');
            return;
        }

        game.players[socket.id] = role;
        socket.join(room);

        socket.emit('playerAssigned', { role, room });

        // Start Game if 2 players
        if (Object.keys(game.players).length === 2) {
            game.active = true;
            resetBall(game, 1);
            io.to(room).emit('gameStart');
        } else {
            socket.emit('waitingForOpponent');
        }
    });

    socket.on('move', (data) => {
        // data = { y: 123 } (Client sends raw Y position based on mouse or keys)
        const roomName = Object.keys(rooms).find(r => rooms[r].players[socket.id]);
        if (!roomName) return;

        const game = rooms[roomName];
        const role = game.players[socket.id];

        // Update Paddle Position (Clamped to screen)
        if (role === 1) game.p1.y = data.y;
        if (role === 2) game.p2.y = data.y;
    });

    socket.on('disconnect', () => {
        const roomName = Object.keys(rooms).find(r => rooms[r].players[socket.id]);
        if (roomName) {
            const game = rooms[roomName];
            delete game.players[socket.id];
            
            game.active = false;
            io.to(roomName).emit('opponentLeft');

            if (Object.keys(game.players).length === 0) {
                delete rooms[roomName];
            }
        }
    });
});