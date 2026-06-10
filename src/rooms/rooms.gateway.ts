import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Room } from './room.entity'

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly members = new Map<
    string,
    Map<
      string,
      {
        socketId: string
        userId: string
        username: string
        displayName: string
        avatarDataUrl?: string
        points?: number
        rankTitle?: string
      }
    >
  >()
  private readonly socketRooms = new Map<string, string>()

  handleConnection(socket: Socket) {
    socket.emit('socket-ready', { id: socket.id })
  }

  handleDisconnect(socket: Socket) {
    this.removeMember(socket)
  }

  @SubscribeMessage('join-room')
  joinRoom(
    @MessageBody()
    payload:
      | string
      | {
          roomCode: string
          user?: {
            id: string
            username: string
            displayName: string
            avatarDataUrl?: string
            points?: number
            rankTitle?: string
          }
        },
    @ConnectedSocket() socket: Socket,
  ) {
    const roomCode = typeof payload === 'string' ? payload : payload.roomCode
    const user = typeof payload === 'string' ? undefined : payload.user
    const currentRoomCode = this.socketRooms.get(socket.id)
    if (currentRoomCode && currentRoomCode !== roomCode) {
      this.removeMember(socket)
    }
    socket.join(roomCode)
    this.socketRooms.set(socket.id, roomCode)
    if (user) {
      const roomMembers = this.members.get(roomCode) ?? new Map()
      const alreadyOnline = [...roomMembers.values()].some((member) => member.userId === user.id)
      roomMembers.set(socket.id, {
        socketId: socket.id,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarDataUrl: user.avatarDataUrl,
        points: user.points,
        rankTitle: user.rankTitle,
      })
      this.members.set(roomCode, roomMembers)
      this.emitMembers(roomCode)
      if (!alreadyOnline) {
        this.server.to(roomCode).emit('room-presence', {
          type: 'join',
          user: {
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarDataUrl: user.avatarDataUrl,
            points: user.points,
            rankTitle: user.rankTitle,
          },
          message: `${user.displayName} 进入了房间`,
          at: new Date().toISOString(),
        })
      }
    }
    return { joined: roomCode }
  }

  @SubscribeMessage('leave-room')
  leaveRoom(@ConnectedSocket() socket: Socket) {
    this.removeMember(socket)
    return { left: true }
  }

  @SubscribeMessage('canvas-preview')
  previewCanvas(
    @MessageBody() payload: { roomCode: string; canvasDataUrl: string },
    @ConnectedSocket() socket: Socket,
  ) {
    socket.to(payload.roomCode).emit('canvas-updated', {
      roomCode: payload.roomCode,
      canvasDataUrl: payload.canvasDataUrl,
    })
  }

  emitRoom(room: Room) {
    this.server.to(room.code).emit('room-updated', room)
  }

  isUserOnline(roomCode: string, userId: string) {
    return [...(this.members.get(roomCode)?.values() ?? [])].some((member) => member.userId === userId)
  }

  private removeMember(socket: Socket) {
    const roomCode = this.socketRooms.get(socket.id)
    if (!roomCode) return
    this.socketRooms.delete(socket.id)
    const roomMembers = this.members.get(roomCode)
    socket.leave(roomCode)
    if (!roomMembers) {
      this.emitMembers(roomCode)
      return
    }
    const leavingMember = roomMembers.get(socket.id)
    roomMembers.delete(socket.id)
    const stillOnline = leavingMember
      ? [...roomMembers.values()].some((member) => member.userId === leavingMember.userId)
      : false
    if (!roomMembers.size) {
      this.members.delete(roomCode)
    }
    this.emitMembers(roomCode)
    if (leavingMember && !stillOnline) {
      this.server.to(roomCode).emit('room-presence', {
        type: 'leave',
        user: {
          userId: leavingMember.userId,
          username: leavingMember.username,
          displayName: leavingMember.displayName,
          avatarDataUrl: leavingMember.avatarDataUrl,
          points: leavingMember.points,
          rankTitle: leavingMember.rankTitle,
        },
        message: `${leavingMember.displayName} 离开了房间`,
        at: new Date().toISOString(),
      })
    }
  }

  private emitMembers(roomCode: string) {
    const usersById = new Map<
      string,
      {
        userId: string
        username: string
        displayName: string
        avatarDataUrl?: string
        points?: number
        rankTitle?: string
      }
    >()
    for (const member of this.members.get(roomCode)?.values() ?? []) {
      usersById.set(member.userId, {
        userId: member.userId,
        username: member.username,
        displayName: member.displayName,
        avatarDataUrl: member.avatarDataUrl,
        points: member.points,
        rankTitle: member.rankTitle,
      })
    }
    this.server.to(roomCode).emit('room-members', [...usersById.values()])
  }
}
