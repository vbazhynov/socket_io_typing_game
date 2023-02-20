import { inputSocketEvents, outputSocketEvents } from './enums/socketEvents.js';
import {
  showInputModal,
  showMessageModal,
  showResultsModal,
} from './views/modal.mjs';
import { appendRoomElement, removeRoomElement } from './views/room.mjs';
import {
  appendUserElement,
  changeReadyStatus,
  setProgress,
} from './views/user.mjs';
import { getData } from './helpers/apiHelper.mjs';

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
    socket.emit(outputSocketEvents.JoinRoom, roomName, username);
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

const onJoinPermitted = roomName => {
  const gamePageEl = document.querySelector('#game-page');
  gamePageEl.classList.remove('display-none');
  const roomsPageEl = document.querySelector('#rooms-page');
  roomsPageEl.classList.add('display-none');
  const roomNameEl = document.querySelector('#room-name');
  roomNameEl.innerHTML = roomName;
};

const onRoomIsFull = () => {
  showMessageModal({
    message: 'Room Reach Users Limit',
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
  socket.emit(outputSocketEvents.LeaveRoom, roomName, username);
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
  socket.emit(outputSocketEvents.UserReadyCl, username, roomId, status);
  const readyAllUsers = document.querySelectorAll('.ready-status');
  if (readyAllUsers) {
    for (let user of readyAllUsers) {
      if (user.dataset.ready === 'false') {
        return;
      }
    }
  } else {
    return;
  }
  const roomNameEl = document.querySelector('#room-name');
  const roomName = roomNameEl.innerText;
  socket.emit(outputSocketEvents.UsersReady, roomName);
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
    socket.emit(outputSocketEvents.JoinRoom, roomName);
  };
  const roomsContainer = document.querySelector('#rooms-wrapper');
  roomsContainer.innerHTML = '';
  for (let key in rooms) {
    console.log(rooms[key].hide);
    if (!rooms[key].hide) {
      const usersNumber = rooms[key].users.length;
      appendRoomElement({ name: key, numberOfUsers: usersNumber, onJoin });
    }
  }
};

const onUserReady = (userName, status) => {
  changeReadyStatus({
    username: userName,
    ready: status,
  });
};

const onStartGameCounter = () => {
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

const onKeyDown = e => {
  let index = sessionStorage.getItem('letter');
  const textLength = sessionStorage.getItem('textLength');
  const letterToCheck = document.querySelector(`#letter${index}`);
  letterToCheck.style.textDecoration = 'none';
  if (e.key === letterToCheck.innerText) {
    letterToCheck.classList.add('checked');
    index++;
    sessionStorage.setItem('letter', index);
    const percents = Math.round((index / textLength) * 100);
    const roomId = document.querySelector('#room-name').innerText;
    socket.emit(outputSocketEvents.UserProgress, username, roomId, percents);
    if (percents === 100) {
      socket.emit(outputSocketEvents.GameEnd, roomId);
    }
  }
};

const onStartGame = async textId => {
  const timerEl = document.querySelector('#timer');
  timerEl.classList.add('display-none');
  const gameTimerEl = document.querySelector('#game-timer');
  gameTimerEl.classList.remove('display-none');
  const textContainer = document.querySelector('#text-container');
  textContainer.classList.remove('display-none');
  const text = await getData(`/game/texts/${textId}`);
  const textArr = text.split('');
  textContainer.innerHTML = '';
  let letterCounter = 0;
  for (let letter of textArr) {
    const letterEl = document.createElement('span');
    letterEl.innerText = letter;
    letterEl.setAttribute('id', `letter${letterCounter}`);
    letterCounter++;
    textContainer.append(letterEl);
  }
  window.addEventListener('keydown', onKeyDown);
  sessionStorage.setItem('letter', 0);
  sessionStorage.setItem('textLength', textArr.length);
};

const onShowGameCounter = count => {
  const gameTimerEl = document.querySelector('#game-timer');
  gameTimerEl.innerText = count;
};

const onUpdateProgressBar = (username, progress) => {
  setProgress({ username, progress });
};

const onFinishGame = users => {
  const onClose = () => {
    const readyBtn = document.querySelector('#ready-btn');
    readyBtn.innerText = 'READY';
    readyBtn.classList.remove('display-none');
    const quitBtn = document.querySelector('#quit-room-btn');
    quitBtn.classList.remove('display-none');
  };
  console.log(users);
  for (const user of users) {
    changeReadyStatus({
      username: user,
      ready: false,
    });
  }
  window.removeEventListener('keydown', onKeyDown);
  const gameTimerEl = document.querySelector('#game-timer');
  gameTimerEl.classList.add('display-none');
  const textContainer = document.querySelector('#text-container');
  textContainer.classList.add('display-none');
  const usersEl = document.querySelectorAll('.user');
  let usersSortedArray = [];
  for (const el of usersEl) {
    const user = { name: el.querySelector('.username').dataset.username };
    user.progress = Number(
      el.querySelector('.user-progress').style.width.slice(0, -1),
    );
    usersSortedArray.push(user);
  }
  usersSortedArray.sort((a, b) => (a.progress < b.progress ? 1 : -1));
  showResultsModal({ usersSortedArray, onClose });
};

socket.on(inputSocketEvents.JoinPermitted, onJoinPermitted);
socket.on(inputSocketEvents.DeleteRoom, onDeleteRoom);
socket.on(inputSocketEvents.CreateUsers, onUsersCreate);
socket.on(inputSocketEvents.UserExist, onUserExistError);
socket.on(inputSocketEvents.UpdateRooms, onUpdateRooms);
socket.on(inputSocketEvents.UserReady, onUserReady);
socket.on(inputSocketEvents.LaunchStartCounter, onStartGameCounter);
socket.on(inputSocketEvents.ShowCounterBeforeGame, onShowCounterBeforeGame);
socket.on(inputSocketEvents.StartGAme, onStartGame);
socket.on(inputSocketEvents.ShowGameCounter, onShowGameCounter);
socket.on(inputSocketEvents.UpdateProgressBar, onUpdateProgressBar);
socket.on(inputSocketEvents.FinishGame, onFinishGame);
