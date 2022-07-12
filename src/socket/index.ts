import { Socket } from 'dgram';
import { Server } from 'socket.io';
import * as config from './config';
export const usersMap = {};
const roomsObj = {};
const userReady = new Map();

export default (io: Server) => {
  io.on('connection', socket => {
    const username = socket.handshake.query.username;
    if (Object.keys(usersMap).length) {
      for (let value of Object.values(usersMap)) {
        if (value === username) {
          socket.emit('user_exist', username);
          return;
        }
      }
    }
    console.log(`User: ${username} Connected to server`);
    usersMap[socket.id] = username;
    userReady.set(username, false);
    socket.emit('update_rooms', roomsObj);

    socket.on('disconnect', () => {
      console.log(`User: ${socket.id} Disonnected from server`);
      delete usersMap[socket.id];
    });

    socket.on('leave_room', (roomId, username) => {
      userReady.set(username, false);
      let usersArray: string[] = [];
      socket.leave(roomId);
      socket.broadcast.emit('update_rooms', roomsObj);
      const rooms = io.of('/').adapter.rooms;
      const roomUsers = rooms.get(roomId) as Set<string>;
      if (roomUsers) {
        usersArray = [...roomUsers.keys()];
        roomsObj[roomId] = usersArray;
        const mappedNames = usersArray.map(user => usersMap[user]);
        socket.broadcast.emit('update_rooms', roomsObj);
        const objUserReady = Object.fromEntries(userReady.entries());
        io.to(roomId).emit('create_users', mappedNames, objUserReady);
      } else {
        delete roomsObj[roomId];
        io.emit('delete_room', roomId);
      }
    });

    socket.on('user_ready_cl', (username, roomId, status) => {
      io.to(roomId).emit('user_ready', username, status);
      userReady.set(username, status);
    });

    socket.on('join_room', roomId => {
      const rooms = io.of('/').adapter.rooms;
      socket.join(roomId);
      const roomUsers = rooms.get(roomId) as Set<string>;
      const usersArray = [...roomUsers.keys()];
      roomsObj[roomId] = usersArray;
      const mappedNames = usersArray.map(user => usersMap[user]);
      socket.broadcast.emit('update_rooms', roomsObj);
      const objUserReady = Object.fromEntries(userReady.entries());
      io.to(roomId).emit('create_users', mappedNames, objUserReady);
    });

    socket.on('users_ready', roomId => {
      io.to(roomId).emit('launch_start_counter');
      let count = config.SECONDS_TIMER_BEFORE_START_GAME;
      let gameTimeCounter = config.SECONDS_FOR_GAME;
      io.to(roomId).emit('show_counter_before_game', count);
      const timerId = setInterval(() => {
        count--;
        io.to(roomId).emit('show_counter_before_game', count);

        if (count === 0) {
          clearInterval(timerId);
          io.to(roomId).emit('start_game');
          io.to(roomId).emit('show_game_counter', gameTimeCounter);
          const gameTimerId = setInterval(() => {
            gameTimeCounter--;
            io.to(roomId).emit('show_game_counter', gameTimeCounter);
            if (gameTimeCounter === 0) {
              clearInterval(gameTimerId);
            }
          }, 1000);
        }
      }, 1000);
    });
  });
};
