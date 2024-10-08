export interface RoomType {
  name: string;
  users: string[];
}

export interface MsgType {
  userId: string;
  message: string;
  room: RoomType;
}
