import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Room } from './room';
import { RoomStatus } from './type';

@Injectable()
export class RoomService {
  private rooms: Room[] = [];

  constructor() {}

  onModuleInit() {
    const amountRoom = 5; //amount room for gen
    const seatCount = 5; //seat in room amount
    for (let i = 0; i < amountRoom; i++) {
      const roomName = `Room ${i + 1}`;
      this.createRoom(roomName, seatCount);
    }
    console.log('initalize room success');
  }

  createRoom(name: string, seatCount: number): void {
    const maxQueue = 5; //limit queue in one room
    const newRoom = new Room(randomUUID(), name, seatCount, maxQueue);
    this.rooms.push(newRoom);
  }

  getRooms(): Room[] {
    return this.rooms;
  }

  getRoomByFilter(filter: {
    status?: RoomStatus;
    isSeatAvailable?: boolean;
  }): Room[] {
    const allRoom = this.rooms;
    const result = allRoom.filter((room) => {
      const statusRoom = room.getStatus();
      const statusMatch = !filter.status || statusRoom === filter.status;

      const seatAvailableMatch =
        typeof filter.isSeatAvailable !== 'boolean' ||
        (filter.isSeatAvailable === true &&
          statusRoom === RoomStatus.AVAILABLE) ||
        (filter.isSeatAvailable === false && statusRoom === RoomStatus.FULL);

      return statusMatch && seatAvailableMatch;
    });
    return result;
  }

  getRoomById(id: string): Room | null {
    const targetRoom = this.rooms.find((room) => {
      return room.getId() == id;
    });
    return targetRoom || null;
  }

  getRoomBySocketId(socketId: string): Room | null {
    return (
      this.rooms.find(
        (room) =>
          room.queue.waiting.includes(socketId) ||
          room.queue.usage.includes(socketId),
      ) || null
    );
  }
}
