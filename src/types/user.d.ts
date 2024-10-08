export interface RoomType {
  name: string;
  users: string[];
}

export interface MsgType {
  userId: string;
  message: string;
  room: RoomType;
}

export interface DataVideoRoomResponse {
  room: RoomType;
  error?: string | null;
  data: { stream: MediaStream | null; user: string };
}
