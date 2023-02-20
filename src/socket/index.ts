import { outputSocketEvents, inputSocketEvents } from '../enums/socketEvents';
import { Server } from 'socket.io';
import * as config from './config';
export const usersMap = { users: {}, rooms: {} };
const roomsObj = {};
const userReady = new Map();

export default (io: Server) => {
  io.on(inputSocketEvents.Connection, socket => {
    const username = socket.handshake.query.username;
    if (Object.keys(usersMap.users).length) {
      for (let value of Object.values(usersMap.users)) {
        if (value === username) {
          socket.emit(outputSocketEvents.UserExist, username);
          return;
        }
      }
    }

    const leaveRoom = (roomId: string, username: string) => {
      delete usersMap.rooms[socket.id];
      userReady.set(username, false);
      let usersArray: string[] = [];
      socket.leave(roomId);
      const rooms = io.of('/').adapter.rooms;
      const roomUsers = rooms.get(roomId) as Set<string>;
      if (roomUsers) {
        usersArray = [...roomUsers.keys()];
        roomsObj[roomId] = { users: usersArray, hide: false };
        const mappedNames = usersArray.map(user => usersMap.users[user]);
        socket.broadcast.emit(outputSocketEvents.UpdateRooms, roomsObj);
        const objUserReady = Object.fromEntries(userReady.entries());
        io.to(roomId).emit(
          outputSocketEvents.CreateUsers,
          mappedNames,
          objUserReady,
        );
      } else {
        delete roomsObj[roomId];
        io.emit(outputSocketEvents.DeleteRoom, roomId);
      }
    };

    usersMap.users[socket.id] = username;
    userReady.set(username, false);
    socket.emit(outputSocketEvents.UpdateRooms, roomsObj);

    socket.on(inputSocketEvents.Disconnect, () => {
      const disconnectedUsername = usersMap.users[socket.id];
      const room = usersMap.rooms[socket.id];
      leaveRoom(room, disconnectedUsername);
      delete usersMap.users[socket.id];
    });

    socket.on(inputSocketEvents.LeaveRoom, (roomId, username) => {
      leaveRoom(roomId, username);
    });

    socket.on(inputSocketEvents.UserReadyCl, (username, roomId, status) => {
      io.to(roomId).emit(outputSocketEvents.UserReady, username, status);
      userReady.set(username, status);
    });

    socket.on(inputSocketEvents.JoinRoom, roomId => {
      console.log('room ' + roomId);

      const rooms = io.of('/').adapter.rooms;
      usersMap.rooms[socket.id] = roomId;
      socket.join(roomId);
      const roomUsers = rooms.get(roomId) as Set<string>;
      const usersArray = [...roomUsers.keys()];
      socket.emit(outputSocketEvents.JoinPermitted, roomId);
      roomsObj[roomId] = { users: usersArray };
      const mappedNames = usersArray.map(user => usersMap.users[user]);
      if (usersArray.length === config.MAXIMUM_USERS_FOR_ONE_ROOM) {
        roomsObj[roomId].hide = true;
      }
      socket.broadcast.emit(outputSocketEvents.UpdateRooms, roomsObj);
      const objUserReady = Object.fromEntries(userReady.entries());
      io.to(roomId).emit(
        outputSocketEvents.CreateUsers,
        mappedNames,
        objUserReady,
      );
    });

    const onGameEnd = roomId => {
      const usersNames: any = [];
      for (const user of roomsObj[roomId].users) {
        const name = usersMap.users[user];
        userReady.set(name, false);
        usersNames.push(name);
      }
      clearInterval(roomsObj[roomId].gameTimerId);
      io.to(roomId).emit(outputSocketEvents.FinishGame, usersNames);
      roomsObj[roomId].hide = false;
      socket.broadcast.emit(outputSocketEvents.UpdateRooms, roomsObj);
    };

    socket.on(inputSocketEvents.UsersReady, roomId => {
      io.to(roomId).emit(outputSocketEvents.LaunchStartCounter);
      let count = config.SECONDS_TIMER_BEFORE_START_GAME;
      let gameTimeCounter = config.SECONDS_FOR_GAME;
      roomsObj[roomId].hide = true;
      socket.broadcast.emit(outputSocketEvents.UpdateRooms, roomsObj);
      io.to(roomId).emit(outputSocketEvents.ShowCounterBeforeGame, count);
      const timerId = setInterval(() => {
        count--;
        io.to(roomId).emit(outputSocketEvents.ShowCounterBeforeGame, count);

        if (count === 0) {
          clearInterval(timerId);
          const textId = Math.round(Math.random() * (7 - 1) + 1);
          io.to(roomId).emit(outputSocketEvents.StartGAme, textId);
          io.to(roomId).emit(
            outputSocketEvents.ShowGameCounter,
            gameTimeCounter,
          );
          const gameTimerId = setInterval(() => {
            gameTimeCounter--;
            io.to(roomId).emit(
              outputSocketEvents.ShowGameCounter,
              gameTimeCounter,
              gameTimerId,
            );
            if (gameTimeCounter === 0) {
              clearInterval(gameTimerId);
              onGameEnd(roomId);
            }
          }, 1000);
          roomsObj[roomId].gameTimerId = gameTimerId;
        }
      }, 1000);
    });

    socket.on(inputSocketEvents.UserProgress, (username, roomId, percents) => {
      io.to(roomId).emit(
        outputSocketEvents.UpdateProgressBar,
        username,
        percents,
      );
    });

    socket.on(inputSocketEvents.GameEnd, roomId => {
      onGameEnd(roomId);
    });
  });
};
