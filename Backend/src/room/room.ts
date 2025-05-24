import { RoomStatus } from './type';

export interface Seat {
  id: string;
  owner: string | null;
}
export class Room {
  seat: Seat[];
  queue: {
    usage: string[]; //id
    waiting: string[]; //id
  };

  constructor(
    private id: string,
    private name: string,
    private maxSeat: number,
    private maxQueue: number,
  ) {
    this.seat = Array.from({ length: maxSeat }, (_, index) => ({
      id: `seat-${index + 1}`,
      owner: null,
    }));
    this.queue = {
      usage: [],
      waiting: [],
    };
  }

  getName(): string {
    return this.name;
  }

  getId(): string {
    return this.id;
  }

  getStatus(): RoomStatus {
    const bookingSeat = this.seat.filter((seat) => seat.owner !== null);
    return bookingSeat.length >= this.maxSeat
      ? RoomStatus.FULL
      : RoomStatus.AVAILABLE;
  }

  isCanJoin(): boolean {
    return (
      this.queue.usage.length <= this.maxQueue && this.queue.waiting.length < 1
    );
  }

  isAvailableSlotForBooking(): boolean {
    return this.queue.usage.length <= this.maxQueue;
  }

  assignSeatByUser(seatId: string, userId: string): Seat | null {
    const targetSeat = this.seat.find((seat) => seat.id === seatId);
    if (!targetSeat || targetSeat.owner !== null) {
      return null;
    }
    targetSeat.owner = userId;
    return targetSeat;
  }
}
