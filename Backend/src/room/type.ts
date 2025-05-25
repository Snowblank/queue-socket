export interface RoomsResponse {
  id: string;
  name: string;
  status: RoomStatus;
  seat: {
    booking: number;
    max: number;
  };
}
export interface RoomResponse {
  id: string;
  name: string;
  status: RoomStatus;
  seat: {
    id: string;
    owner: string | null;
  }[];
}

export interface ResponseSelectRoom {
  queuePosition: number;
}

export interface ResponseSubmitSeat {
  message: string;
  roomId: string;
  seatId: string;
}

export interface User {
  id: string;
}

export enum RoomStatus {
  AVAILABLE = 'available',
  FULL = 'full',
}
