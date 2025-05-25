import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Room } from './room';

@Injectable()
export class RoomService {
  private rooms: Room[] = [];

  constructor() {}

  onModuleInit() {
    const amountRoom = 2;
    const seatCount = 2;
    for (let i = 0; i < amountRoom; i++) {
      const roomName = `Room ${i + 1}`;
      this.createRoom(roomName, seatCount);
    }
    console.log('initalize room success');
  }

  createRoom(name: string, seatCount: number): void {
    const maxQueue = 2;
    const newRoom = new Room(randomUUID(), name, seatCount, maxQueue);
    this.rooms.push(newRoom);
  }

  getRooms(): Room[] {
    return this.rooms;
  }

  getRoomById(id: string): Room | null {
    const targetRoom = this.rooms.find((room) => {
      return room.getId() == id;
    });
    return targetRoom || null;
  }

  getRoomByUserId(userId: string): Room | null {
    return (
      this.rooms.find(
        (room) =>
          room.queue.waiting.includes(userId) ||
          room.queue.usage.includes(userId),
      ) || null
    );
  }
}
