export const outputSocketEvents = {
  Connection: 'connection',
  Disconnect: 'disconnect',
  LeaveRoom: 'leave_room',
  UserReadyCl: 'user_ready_cl',
  JoinRoom: 'join_room',
  UsersReady: 'users_ready',
  UserProgress: 'user-progress',
  GameEnd: 'game-end',
};

export const inputSocketEvents = {
  UpdateRooms: 'update_rooms',
  UserExist: 'user_exist',
  CreateUsers: 'create_users',
  DeleteRoom: 'delete_room',
  UserReady: 'user_ready',
  JoinPermitted: 'join_permitted',
  FinishGame: 'finish-game',
  LaunchStartCounter: 'launch_start_counter',
  ShowCounterBeforeGame: 'show_counter_before_game',
  StartGAme: 'start_game',
  ShowGameCounter: 'show_game_counter',
  UpdateProgressBar: 'update-progress-bar',
};
