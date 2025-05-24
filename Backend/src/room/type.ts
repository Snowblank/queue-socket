export interface RoomResponse { //TODO: implement for interface controller
  id: string;
  name: string;
  seat: {
    id: string;
    owner: string | null;
  }[];
  queue: number;
  status: RoomStatus;
}

export interface User {
  id: string;
}

export enum RoomStatus {
  AVAILABLE = 'available',
  FULL = 'full',
}
