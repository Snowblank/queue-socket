import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { ResponseSelectRoom, ResponseSubmitSeat, RoomStatus } from './type';
import { Room } from './room';

export interface ResponseSocket<T = unknown> {
  data: T | null;
  error: {
    message: string;
  } | null;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomService: RoomService) {}

  handleConnection(client: Socket, ...args: any[]) {
    const clientId: string = client.handshake.auth.clientId;
    if (!clientId) {
      client.disconnect();
      return;
    }

    //setup clientData
    client.data = {
      clientId,
    };

    console.log('Client connected:', client.id);
  }

  async handleDisconnect(client: Socket) {
    const targetRoom = this.roomService.getRoomBySocketId(client.id);
    if (!targetRoom) return;

    targetRoom.removeQueueBySocketId(client.id);

    const isAvailableSlot = targetRoom.isAvailableSlotForBooking();
    if (isAvailableSlot) {
      await this.nextQueue(targetRoom);
    }
    targetRoom.queue.waiting.forEach((socketId, index) => {
      this.server.to(socketId).emit('updatePosition', { position: index + 1 });
    });
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage('selectRoom')
  async selectRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<ResponseSocket<ResponseSelectRoom>> {
    console.log(`client: ${client.id} event: selectRoom => data`, data);
    const clientId: string = client.data.clientId;
    try {
      if (!clientId) throw new Error('Invalid Session');

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
        return { data: { queuePosition: 0 }, error: null };
      } else {
        await client.join(`queue-waiting-${targetRoom.getId()}`);
        if (!targetRoom.queue.waiting.includes(client.id)) {
          targetRoom.queue.waiting.push(client.id);
        }

        const positionQueue = targetRoom.queue.waiting.indexOf(client.id) + 1;

        this.server.to(client.id).emit('queueJoined', {
          roomId: targetRoom.getId(),
          position: positionQueue,
        });

        return { data: { queuePosition: positionQueue }, error: null };
      }
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Internal Server Error' },
      };
    }
  }

  @SubscribeMessage('submitSeat')
  submitSeatByRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; seatId: string },
  ): ResponseSocket<ResponseSubmitSeat> {
    console.log(`client: ${client.id} event: submitSeat => data`, data);
    const clientId: string = client.data.clientId;

    try {
      if (!clientId) throw new Error('Invalid Session');

      const targetRoom = this.roomService.getRoomById(data.roomId);
      if (!targetRoom || targetRoom.getStatus() === RoomStatus.FULL)
        throw new Error('target room not available');

      const assignSeat = targetRoom.assignSeatByUser(data.seatId, clientId);
      if (!assignSeat) {
        throw new Error('seat not available for booking');
      }
      return {
        data: {
          message: 'booking seat success',
          roomId: targetRoom.getId(),
          seatId: assignSeat.id,
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Internal Server Error' },
      };
    }
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<ResponseSocket<{ message: string }>> {
    console.log(`client: ${client.id} event: leaveRoom => data`, data);
    const clientId: string = client.data.clientId;

    try {
      if (!clientId) throw new Error('Invalid Session');

      const targetRoom = this.roomService.getRoomById(data.roomId);
      if (!targetRoom) throw new Error('target room not available');
      targetRoom.removeQueueBySocketId(client.id);

      const isAvailableSlot = targetRoom.isAvailableSlotForBooking();
      if (isAvailableSlot) {
        await this.nextQueue(targetRoom);
      }
      targetRoom.queue.waiting.forEach((socketId, index) => {
        this.server
          .to(socketId)
          .emit('updatePosition', { position: index + 1 });
      });
      return { data: { message: 'Leave Success' }, error: null };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Internal Server Error' },
      };
    }
  }

  async nextQueue(room: Room): Promise<void> {
    const userId = room.queue.waiting.shift();
    if (userId) {
      room.queue.usage.push(userId);
      const targetSocket = this.server.sockets.sockets.get(userId);
      if (targetSocket) {
        await targetSocket.leave(`queue-waiting-${room.getId()}`);
        this.server.to(userId).emit('joinedRoom', { roomId: room.getId() });
      }
    }
    room.queue.waiting.forEach((clientId, index) => {
      this.server.to(clientId).emit('updatePosition', { position: index + 1 });
    });
  }
}
