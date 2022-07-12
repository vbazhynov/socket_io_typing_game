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
  const username = sessionStorage.getItem('username');
  const gamePageEl = document.querySelector('#game-page');
  gamePageEl.classList.add('display-none');
  const roomsPageEl = document.querySelector('#rooms-page');
  roomsPageEl.classList.remove('display-none');
  const roomNameEl = document.querySelector('#room-name');
  const roomName = roomNameEl.innerText;
  console.log('room name ' + roomName);
  socket.emit('leave_room', roomName, username);
};

const onReadyBtnClick = () => {
  const username = sessionStorage.getItem('username');
  const userReadyStatusEl = document.querySelector(
    '.ready-status[data-username="' + username + '"]',
  );
  const userReadyStatus = userReadyStatusEl.dataset.ready === 'true';
  const status = !userReadyStatus;
  changeReadyStatus({
    username: username,
    ready: status,
  });
  const readyBtn = document.querySelector('#ready-btn');
  readyBtn.innerText = status ? 'NOT READY' : 'READY';
  const roomId = document.querySelector('#room-name').innerText;
  socket.emit('user_ready_cl', username, roomId, status);
  const readyAllUsers = document.querySelectorAll('.ready-status');
  if (readyAllUsers) {
    for (let user of readyAllUsers) {
      if (user.dataset.ready === 'false') {
        console.log('here');
        return;
      }
    }
  } else {
    return;
  }
  console.log('ready');
  const roomNameEl = document.querySelector('#room-name');
  const roomName = roomNameEl.innerText;
  socket.emit('users_ready', roomName);
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

const onUsersCreate = (userNames, userReadyStatus) => {
  const currentUser = sessionStorage.getItem('username');
  const usersContainer = document.querySelector('#users-wrapper');
  usersContainer.innerHTML = '';
  for (let user of userNames) {
    const isCurrentUser = user === currentUser ? true : false;
    appendUserElement({
      username: user,
      ready: userReadyStatus[user],
      isCurrentUser: isCurrentUser,
    });
  }
};

const onDeleteRoom = name => {
  removeRoomElement(name);
};

const onUpdateRooms = rooms => {
  const onJoin = e => {
    const roomName = e.target.dataset.roomName;
    const usersQuantityEl = document.querySelector(
      `.connected-users[data-room-name="${roomName}"]`,
    );
    const numberOfUsers = usersQuantityEl.dataset.roomNumberOfUsers;
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

const onStartGameCounter = () => {
  console.log('counter');
  const timerEl = document.querySelector('#timer');
  timerEl.classList.remove('display-none');
  const readyBtn = document.querySelector('#ready-btn');
  readyBtn.classList.add('display-none');
  const quitBtn = document.querySelector('#quit-room-btn');
  quitBtn.classList.add('display-none');
};

const onShowCounterBeforeGame = count => {
  const timerEl = document.querySelector('#timer');
  timerEl.innerText = count;
};

const onStartGame = () => {
  const timerEl = document.querySelector('#timer');
  timerEl.classList.add('display-none');
  const gameTimerEl = document.querySelector('#game-timer');
  gameTimerEl.classList.remove('display-none');
  const textContainer = document.querySelector('#text-container');
  textContainer.classList.remove('display-none');
};

const onShowGameCounter = count => {
  const gameTimerEl = document.querySelector('#game-timer');
  gameTimerEl.innerText = count;
};

socket.on('delete_room', onDeleteRoom);
socket.on('create_users', onUsersCreate);
socket.on('user_exist', onUserExistError);
socket.on('update_rooms', onUpdateRooms);
socket.on('user_ready', onUserReady);
socket.on('launch_start_counter', onStartGameCounter);
socket.on('show_counter_before_game', onShowCounterBeforeGame);
socket.on('start_game', onStartGame);
socket.on('show_game_counter', onShowGameCounter);
