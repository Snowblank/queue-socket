import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { RoomStatus } from './type';
import { Room } from './room';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class QueueGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomService: RoomService) {}

  handleConnection(client: Socket, ...args: any[]) {
    console.log('Client connected:', client.id); //store token
    //add in room waiting
  }

  @SubscribeMessage('selectRoom')
  async selectRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<number> {
    console.log('data', data);
    const targetRoom = this.roomService.getRoomById(data.roomId);
    if (!targetRoom) throw new Error('target room not available');

    const isJoin = targetRoom.isCanJoin();
    if (isJoin) {
      await client.join(targetRoom.getId());

      if (!targetRoom.queue.usage.includes(client.id)) {
        targetRoom.queue.usage.push(client.id);
      }
      this.server
        .to(client.id)
        .emit('joinedRoom', { roomId: targetRoom.getId() });
      return 0;
    } else {
      await client.join(`queue-waiting-${targetRoom.getId()}`);
      if (!targetRoom.queue.waiting.includes(client.id)) {
        targetRoom.queue.waiting.push(client.id);
      }

      // const positionQueue =
      //   this.server.sockets.adapter.rooms.get(
      //     `queue-waiting-${targetRoom.getId()}`,
      //   )?.size || 0;

      const positionQueue = targetRoom.queue.waiting.indexOf(client.id) + 1;

      this.server.to(client.id).emit('queueJoined', {
        roomId: targetRoom.getId(),
        position: positionQueue,
      });

      return positionQueue;
    }
  }

  @SubscribeMessage('submitSeat')
  submitSeatByRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatId: string },
  ) {
    const targetRoom = this.roomService.getRoomById(data.roomId);
    if (!targetRoom || targetRoom.getStatus() === RoomStatus.FULL)
      throw new Error('target room not available');

    const assignSeat = targetRoom.assignSeatByUser(data.seatId, client.id);
    if (!assignSeat) {
      throw new Error('seat not available for booking');
    }
    return { message: 'booking seat success' };
  }

  @SubscribeMessage('leaveRoom')
  leaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const targetRoom = this.roomService.getRoomById(data.roomId);
    if (!targetRoom) throw new Error('target room not available');
    targetRoom.queue.usage = targetRoom.queue.usage.filter(
      (userId) => userId !== client.id,
    );
    const isAvailableSlot = targetRoom.isAvailableSlotForBooking();
    if (isAvailableSlot) {
      this.nextQueue(targetRoom);
    }
  }

  nextQueue(room: Room): void {
    const userId = room.queue.waiting.shift();
    if (userId) {
      room.queue.usage.push(userId);
      this.server.to(userId).emit('joinedRoom', { roomId: room.getId() });
      this.server
        .to(`queue-waiting-${room.getId()}`)
        .emit('updatePosition', { position: -1 });
    }
  }
}
