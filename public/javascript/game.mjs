import { showInputModal, showMessageModal } from './views/modal.mjs';
import { appendRoomElement, removeRoomElement } from './views/room.mjs';
import { appendUserElement, changeReadyStatus } from './views/user.mjs';

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
    const roomNamesEl = document.querySelectorAll('.room');
    for (let room of roomNamesEl) {
      if (room.dataset.roomName === roomName) {
        showMessageModal({ message: 'Room name already exist!' });
        return;
      }
    }
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

const onReadyBtnClick = () => {
  const username = sessionStorage.getItem('username');
  const userReadyStatusEl = document.querySelector(
    '.ready-status[data-username="' + username + '"]',
  );
  const userReadyStatus = userReadyStatusEl.dataset.ready === 'true';
  console.log(userReadyStatus);
  const status = !userReadyStatus;
  console.log(status);
  changeReadyStatus({
    username: username,
    ready: status,
  });
  const roomEl = document.querySelector('#room-name');
  const roomId = roomEl.innerText;
  socket.emit('user_ready_cl', username, roomId, !userReadyStatus);
};

const readyBtn = document.querySelector('#ready-btn');
readyBtn.addEventListener('click', onReadyBtnClick);

const backToRoomsBtn = document.querySelector('#quit-room-btn');
backToRoomsBtn.addEventListener('click', onBackToRooms);

const createRoomBtn = document.querySelector('#add-room-btn');
createRoomBtn.addEventListener('click', createRoomModal);

const onUserExistError = () => {
  const onClose = () => {
    sessionStorage.removeItem('username');
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

const onUpdateRooms = rooms => {
  console.log(rooms);
  const onJoin = e => {
    const roomName = e.target.dataset.roomName;
    const usersQuantityEl = document.querySelector(
      `.connected-users[data-room-name="${roomName}"]`,
    );
    const numberOfUsers = usersQuantityEl.dataset.roomNumberOfUsers;
    console.log(numberOfUsers);
    if (numberOfUsers === '5') {
      showMessageModal({
        message: 'Room Reach Users Limit',
      });
      return;
    }
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
};

const onUserReady = (userName, status) => {
  changeReadyStatus({
    username: userName,
    ready: status,
  });
};

socket.on('delete_room', onDeleteRoom);
socket.on('join_done', onJoinDone);
socket.on('user_exist', onUserExistError);
socket.on('update_rooms', onUpdateRooms);
socket.on('user_ready', onUserReady);
