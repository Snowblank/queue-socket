import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Room } from './room';

@Injectable()
export class RoomService {
  private rooms: Room[] = [];

  constructor() {}

  onModuleInit() {
    const amountRoom = 5;
    const seatCount = 5;
    for (let i = 0; i < amountRoom; i++) {
      const roomName = `Room ${i + 1}`;
      this.createRoom(roomName, seatCount);
    }
    console.log('create room success');
  }

  createRoom(name: string, seatCount: number): void {
    const maxQueue = 5;
    const newRoom = new Room(randomUUID(), name, seatCount, maxQueue);
    this.rooms.push(newRoom);
  }

  getRooms(): Room[] {
    return this.rooms;
  }

  getRoomById(id: string): Room | null {
    const targetRoom = this.rooms.find((room) => room.getId() === id);
    return targetRoom || null;
  }
}
