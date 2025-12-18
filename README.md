# pro-netwrkgames
Here is the updated README written in your voice, keeping it professional and focused on the technical architecture.

---

# Multiplayer Pong: Server-Authoritative Logic

This is a 1v1 multiplayer Pong game built using Node.js, Socket.io, and p5.js. The main goal of this project was to move away from a basic echo server and instead implement a server-authoritative architecture. In this setup, the server acts as the final judge for all physics and scoring, which keeps the game synchronized for both players and prevents client-side manipulation.

## Technical Overview

Instead of letting the browser handle the game logic, I moved the core engine to the backend. This provides several advantages:

1. **Centralized Physics:** The ball's position and speed are calculated only on the server. It uses AABB (Axis-Aligned Bounding Box) logic to handle collisions between the ball, the paddles, and the walls.
2. **Room Management:** I used Socket.io rooms to allow for isolated game sessions. Players can enter a room name to join a lobby, and the physics engine only activates once exactly two players are present.
3. **The Server Heartbeat:** The server runs a 60 FPS update loop. Every 16 milliseconds, it calculates the new state of the game and broadcasts those coordinates to every client in the room simultaneously.

## Tech Stack

* **Frontend:** p5.js is used to handle the canvas rendering and capture keyboard input.
* **Backend:** Node.js and Express handle the web server and file serving.
* **Networking:** Socket.io manages the real-time, bidirectional communication between the server and the players.

## Design and Features

* **Arcade Aesthetic:** I went with a clean, minimalist look using a pixelated scoreboard and a dotted center line to mimic classic arcade machines.
* **Lobby System:** The game includes a "Waiting for Opponent" state. This ensures that the ball doesn't start moving until both players have successfully connected to the same room.
* **Synchronized Rendering:** The client-side code is designed to be a "dumb display." It simply takes the data from the server and paints it to the screen, ensuring that what Player 1 sees is exactly what Player 2 sees.

## Project Structure

```text
├── public/
│   └── index.html   # Client-side UI and p5.js rendering logic
├── server.js        # Server-side physics, rooms, and socket handling
├── package.json     # Project dependencies
└── README.md        # Documentation

```

## Setup and Installation

If you are running this in a GitHub Codespace or on a local machine:

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/your-pong-repo.git
cd your-pong-repo

```


2. **Install the dependencies:**
```bash
npm install

```


3. **Start the server:**
```bash
node server.js

```


4. **How to Play:**
Open your browser to the local address provided. Open a second tab to the same address. Enter the same room name in both windows to start the match.

## Controls

* **Move Up:** W key or Up Arrow
* **Move Down:** S key or Down Arrow
