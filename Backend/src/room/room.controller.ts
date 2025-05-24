import { Controller, Get } from '@nestjs/common';
import { RoomService } from './room.service';
import { Room } from './room';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  getRooms(): Room[] {
    const rooms = this.roomService.getRooms();

    return rooms;
  }

  @Get(':id')
  getRoomById(id: string): Room | null {
    return this.roomService.getRoomById(id);
  }
}
