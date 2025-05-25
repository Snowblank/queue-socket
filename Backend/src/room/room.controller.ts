import { Controller, Get, Param } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomResponse, RoomsResponse } from './type';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  getRooms(): RoomsResponse[] {
    const rooms = this.roomService.getRooms();
    const result: RoomsResponse[] = rooms.map((room) => ({
      id: room.getId(),
      name: room.getName(),
      status: room.getStatus(),
      seat: {
        booking: room.seat.filter((seat) => seat.owner !== null).length,
        max: room.getMaxSeat(),
      },
    }));
    return result;
  }

  @Get('/:id')
  getRoomById(@Param('id') id: string): RoomResponse | null {
    const room = this.roomService.getRoomById(id);
    if (!room) return null;
    const result: RoomResponse = {
      id: room.getId(),
      name: room.getName(),
      status: room.getStatus(),
      seat: room.seat,
    };
    return result;
  }
}
