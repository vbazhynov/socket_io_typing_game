import { Socket } from 'dgram';
import { Server } from 'socket.io';
import * as config from './config';
export const usersMap = {};
const roomsObj = {};

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

    socket.emit('update_rooms', roomsObj);

    socket.on('disconnect', () => {
      console.log(`User: ${socket.id} Disonnected from server`);
      delete usersMap[socket.id];
      console.log(usersMap);
    });

    socket.on('leave_room', roomId => {
      let usersArray: string[] = [];
      console.log('leave');
      socket.leave(roomId);
      socket.broadcast.emit('update_rooms', roomsObj);
      const rooms = io.of('/').adapter.rooms;
      const roomUsers = rooms.get(roomId) as Set<string>;
      if (roomUsers) {
        usersArray = [...roomUsers.keys()];
        roomsObj[roomId] = usersArray;
        const mappedNames = usersArray.map(user => usersMap[user]);
        socket.broadcast.emit('update_rooms', roomsObj);
        io.to(roomId).emit('join_done', mappedNames);
      } else {
        delete roomsObj[roomId];
        io.emit('delete_room', roomId);
        console.log(roomsObj);
      }
    });

    socket.on('user_ready_cl', (username, roomId, status) => {
      io.to(roomId).emit('user_ready', username, status);
    });

    socket.on('join_room', roomId => {
      const rooms = io.of('/').adapter.rooms;
      socket.join(roomId);
      const roomUsers = rooms.get(roomId) as Set<string>;
      const usersArray = [...roomUsers.keys()];
      roomsObj[roomId] = usersArray;
      console.log(roomsObj);

      const mappedNames = usersArray.map(user => usersMap[user]);
      socket.broadcast.emit('update_rooms', roomsObj);
      io.to(roomId).emit('join_done', mappedNames);
    });
  });
};
