import { Module } from '@nestjs/common';
import { QueueGateway } from './queue.gateway';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  controllers: [RoomController],
  providers: [QueueGateway, RoomService],
})
export class RoomModule {}
