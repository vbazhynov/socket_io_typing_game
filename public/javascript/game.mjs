import { showInputModal, showMessageModal } from './views/modal.mjs';
import { appendRoomElement, removeRoomElement } from './views/room.mjs';
import { appendUserElement } from './views/user.mjs';

const username = sessionStorage.getItem('username');

if (!username) {
  window.location.replace('/login');
}

const socket = io('', { query: { username } });

const createRoomModal = () => {
  const onChange = roomName => {
    sessionStorage.setItem('room', roomName);
  };
  const onSubmit = () => {
    const roomName = sessionStorage.getItem('room');
    const gamePageEl = document.querySelector('#game-page');
    gamePageEl.classList.remove('display-none');
    const roomsPageEl = document.querySelector('#rooms-page');
    roomsPageEl.classList.add('display-none');
    const roomNameEl = document.querySelector('#room-name');
    roomNameEl.innerHTML = roomName;
    socket.emit('join_room', roomName, username);
    appendUserElement({
      username: sessionStorage.getItem('username'),
      ready: false,
      isCurrentUser: true,
    });
  };

  showInputModal({
    title: 'Enter Room Name',
    onChange,
    onSubmit,
  });
};

const onBackToRooms = () => {
  const gamePageEl = document.querySelector('#game-page');
  gamePageEl.classList.add('display-none');
  const roomsPageEl = document.querySelector('#rooms-page');
  roomsPageEl.classList.remove('display-none');
  const roomNameEl = document.querySelector('#room-name');
  const roomName = roomNameEl.innerText;
  console.log('room name ' + roomName);
  socket.emit('leave_room', roomName);
};

const backToRoomsBtn = document.querySelector('#quit-room-btn');
backToRoomsBtn.addEventListener('click', onBackToRooms);

const createRoomBtn = document.querySelector('#add-room-btn');
createRoomBtn.addEventListener('click', createRoomModal);

const onUserExistError = () => {
  const onClose = () => {
    sessionStorage.removeItem('username');
    console.log('Yes');
    window.location.replace('/login');
  };

  showMessageModal({
    message: 'User Already Exist!',
    onClose,
  });
};

const onJoinDone = userNames => {
  const currentUser = sessionStorage.getItem('username');
  const usersContainer = document.querySelector('#users-wrapper');
  usersContainer.innerHTML = '';
  for (let user of userNames) {
    const isCurrentUser = user === currentUser ? true : false;
    appendUserElement({
      username: user,
      ready: false,
      isCurrentUser: isCurrentUser,
    });
  }
};

const onDeleteRoom = name => {
  removeRoomElement(name);
};

socket.on('delete_room', onDeleteRoom);
socket.on('join_done', onJoinDone);
socket.on('user_exist', onUserExistError);
socket.on('update_rooms', rooms => {
  console.log(rooms);
  const onJoin = e => {
    const roomName = e.target.dataset.roomName;
    const gamePageEl = document.querySelector('#game-page');
    gamePageEl.classList.remove('display-none');
    const roomsPageEl = document.querySelector('#rooms-page');
    roomsPageEl.classList.add('display-none');
    const roomNameEl = document.querySelector('#room-name');
    roomNameEl.innerHTML = roomName;
    socket.emit('join_room', roomName);
  };
  const roomsContainer = document.querySelector('#rooms-wrapper');
  roomsContainer.innerHTML = '';
  for (let key in rooms) {
    const usersNumber = rooms[key].length;
    appendRoomElement({ name: key, numberOfUsers: usersNumber, onJoin });
  }
});
