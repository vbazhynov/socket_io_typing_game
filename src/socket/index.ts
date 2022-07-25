import { Socket } from 'dgram';
import { stringify } from 'querystring';
import { Server } from 'socket.io';
import * as config from './config';
export const usersMap = { users: {}, rooms: {} };
const roomsObj = {};
const userReady = new Map();

export default (io: Server) => {
  io.on('connection', socket => {
    const username = socket.handshake.query.username;
    if (Object.keys(usersMap.users).length) {
      for (let value of Object.values(usersMap.users)) {
        if (value === username) {
          socket.emit('user_exist', username);
          return;
        }
      }
    }

    const leaveRoom = (roomId: string, username: string) => {
      delete usersMap.rooms[socket.id];
      console.log(usersMap.rooms);
      userReady.set(username, false);
      let usersArray: string[] = [];
      socket.leave(roomId);
      const rooms = io.of('/').adapter.rooms;
      const roomUsers = rooms.get(roomId) as Set<string>;
      if (roomUsers) {
        usersArray = [...roomUsers.keys()];
        roomsObj[roomId] = usersArray;
        const mappedNames = usersArray.map(user => usersMap.users[user]);
        socket.broadcast.emit('update_rooms', roomsObj);
        console.log(roomsObj);
        const objUserReady = Object.fromEntries(userReady.entries());
        console.log(objUserReady);
        io.to(roomId).emit('create_users', mappedNames, objUserReady);
        console.log(mappedNames);
      } else {
        delete roomsObj[roomId];
        io.emit('delete_room', roomId);
      }
    };

    console.log(`User: ${username} Connected to server`);
    usersMap.users[socket.id] = username;
    userReady.set(username, false);
    socket.emit('update_rooms', roomsObj);

    socket.on('disconnect', () => {
      const disconnectedUsername = usersMap.users[socket.id];
      console.log(`User: ${disconnectedUsername} Disonnected from server`);
      const room = usersMap.rooms[socket.id];
      leaveRoom(room, disconnectedUsername);
      delete usersMap.users[socket.id];
    });

    socket.on('leave_room', (roomId, username) => {
      leaveRoom(roomId, username);
    });

    socket.on('user_ready_cl', (username, roomId, status) => {
      io.to(roomId).emit('user_ready', username, status);
      userReady.set(username, status);
    });

    socket.on('join_room', roomId => {
      const rooms = io.of('/').adapter.rooms;
      usersMap.rooms[socket.id] = roomId;
      console.log(usersMap.rooms);
      socket.join(roomId);
      const roomUsers = rooms.get(roomId) as Set<string>;
      const usersArray = [...roomUsers.keys()];
      console.log(usersArray.length);
      if (usersArray.length > config.MAXIMUM_USERS_FOR_ONE_ROOM) {
        socket.emit('room_is_full');
        socket.leave(roomId);
      } else {
        socket.emit('join_permitted', roomId);
        roomsObj[roomId] = usersArray;
        const mappedNames = usersArray.map(user => usersMap.users[user]);
        socket.broadcast.emit('update_rooms', roomsObj);
        const objUserReady = Object.fromEntries(userReady.entries());
        io.to(roomId).emit('create_users', mappedNames, objUserReady);
      }
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
          const textId = Math.round(Math.random() * (7 - 1) + 1);
          io.to(roomId).emit('start_game', textId);
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
