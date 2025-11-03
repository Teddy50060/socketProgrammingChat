import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface Client {
  id: string;
  name: string;
  socket: Socket;
}

interface ChatGroup {
  id: string;
  name: string;
  creatorId: string;
  members: Set<string>; // Set of client IDs
}

interface PrivateMessage {
  from: string;
  to: string;
  message: string;
  timestamp: number;
}

interface GroupMessage {
  from: string;
  groupId: string;
  message: string;
  timestamp: number;
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // Next.js frontend
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Store connected clients
  private clients: Map<string, Client> = new Map();
  
  // Store chat groups
  private groups: Map<string, ChatGroup> = new Map();
  
  // Store private chat messages (in memory for current session)
  private privateMessages: Map<string, PrivateMessage[]> = new Map();
  
  // Store group chat messages (in memory for current session)
  private groupMessages: Map<string, GroupMessage[]> = new Map();

  handleConnection(socket: Socket) {
    console.log(`Client connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    const client = this.clients.get(socket.id);
    if (client) {
      console.log(`Client disconnected: ${client.name} (${socket.id})`);
      
      // Remove from all groups
      this.groups.forEach((group) => {
        if (group.members.has(socket.id)) {
          group.members.delete(socket.id);
          // Notify group members
          this.emitToGroup(group.id, 'group:member-left', {
            groupId: group.id,
            groupName: group.name,
            clientId: socket.id,
            clientName: client.name,
          });
        }
      });
      
      // Remove client
      this.clients.delete(socket.id);
      
      // Broadcast updated client list to all
      this.broadcastClientList();
      
      // Broadcast updated group list to all
      this.broadcastGroupList();
    }
  }

  // R3: Set unique client name
  @SubscribeMessage('client:set-name')
  handleSetName(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { name: string },
  ) {
    const { name } = data;
    
    // Check if name is already taken
    const nameExists = Array.from(this.clients.values()).some(
      (client) => client.name === name && client.id !== socket.id,
    );
    
    if (nameExists) {
      socket.emit('client:name-error', {
        error: 'Name already taken',
      });
      return;
    }
    
    // Set or update client name
    this.clients.set(socket.id, {
      id: socket.id,
      name: name,
      socket: socket,
    });
    
    socket.emit('client:name-set', {
      id: socket.id,
      name: name,
    });
    
    // R4: Broadcast updated client list to all
    this.broadcastClientList();
    
    console.log(`Client name set: ${name} (${socket.id})`);
  }

  // R4: Get list of all connected clients
  @SubscribeMessage('client:get-list')
  handleGetClientList(@ConnectedSocket() socket: Socket) {
    const clientList = Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      name: client.name,
    }));
    
    socket.emit('client:list', clientList);
  }

  // R7: Send private message
  @SubscribeMessage('private:send')
  handlePrivateMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; message: string },
  ) {
    const sender = this.clients.get(socket.id);
    const receiver = this.clients.get(data.to);
    
    if (!sender) {
      socket.emit('error', { message: 'You must set a name first' });
      return;
    }
    
    if (!receiver) {
      socket.emit('error', { message: 'Receiver not found' });
      return;
    }
    
    const privateMessage: PrivateMessage = {
      from: sender.id,
      to: receiver.id,
      message: data.message,
      timestamp: Date.now(),
    };
    
    // Store message in memory
    const chatKey = this.getPrivateChatKey(sender.id, receiver.id);
    if (!this.privateMessages.has(chatKey)) {
      this.privateMessages.set(chatKey, []);
    }
    this.privateMessages.get(chatKey).push(privateMessage);
    
    // Send to both sender and receiver (R7: only sender and receiver can see)
    const messageData = {
      from: sender.name,
      fromId: sender.id,
      to: receiver.name,
      toId: receiver.id,
      message: data.message,
      timestamp: privateMessage.timestamp,
    };
    
    socket.emit('private:message', messageData);
    receiver.socket.emit('private:message', messageData);
    
    console.log(`Private message from ${sender.name} to ${receiver.name}: ${data.message}`);
  }

  // Get private chat history
  @SubscribeMessage('private:get-history')
  handleGetPrivateHistory(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { withClientId: string },
  ) {
    const client = this.clients.get(socket.id);
    if (!client) return;
    
    const chatKey = this.getPrivateChatKey(socket.id, data.withClientId);
    const messages = this.privateMessages.get(chatKey) || [];
    
    const history = messages.map((msg) => {
      const sender = this.clients.get(msg.from);
      const receiver = this.clients.get(msg.to);
      return {
        from: sender?.name || 'Unknown',
        fromId: msg.from,
        to: receiver?.name || 'Unknown',
        toId: msg.to,
        message: msg.message,
        timestamp: msg.timestamp,
      };
    });
    
    socket.emit('private:history', {
      withClientId: data.withClientId,
      messages: history,
    });
  }

  // R8: Create a group
  @SubscribeMessage('group:create')
  handleCreateGroup(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { groupName: string },
  ) {
    const client = this.clients.get(socket.id);
    if (!client) {
      socket.emit('error', { message: 'You must set a name first' });
      return;
    }
    
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const group: ChatGroup = {
      id: groupId,
      name: data.groupName,
      creatorId: socket.id,
      members: new Set([socket.id]), // R8: Initially includes only creator
    };
    
    this.groups.set(groupId, group);
    this.groupMessages.set(groupId, []);
    
    socket.emit('group:created', {
      id: group.id,
      name: group.name,
      creatorId: group.creatorId,
      creatorName: client.name,
    });
    
    // R9: Broadcast updated group list to all clients
    this.broadcastGroupList();
    
    console.log(`Group created: ${data.groupName} by ${client.name}`);
  }

  // R9: Get list of all groups
  @SubscribeMessage('group:get-list')
  handleGetGroupList(@ConnectedSocket() socket: Socket) {
    const groupList = Array.from(this.groups.values()).map((group) => {
      const creator = this.clients.get(group.creatorId);
      const members = Array.from(group.members).map((memberId) => {
        const member = this.clients.get(memberId);
        return {
          id: memberId,
          name: member?.name || 'Unknown',
        };
      });
      
      return {
        id: group.id,
        name: group.name,
        creatorId: group.creatorId,
        creatorName: creator?.name || 'Unknown',
        members: members,
      };
    });
    
    socket.emit('group:list', groupList);
  }

  // R10: Join a group
  @SubscribeMessage('group:join')
  handleJoinGroup(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    const client = this.clients.get(socket.id);
    const group = this.groups.get(data.groupId);
    
    if (!client) {
      socket.emit('error', { message: 'You must set a name first' });
      return;
    }
    
    if (!group) {
      socket.emit('error', { message: 'Group not found' });
      return;
    }
    
    if (group.members.has(socket.id)) {
      socket.emit('error', { message: 'You are already a member of this group' });
      return;
    }
    
    // Add client to group
    group.members.add(socket.id);
    
    socket.emit('group:joined', {
      groupId: group.id,
      groupName: group.name,
    });
    
    // Notify all group members
    this.emitToGroup(group.id, 'group:member-joined', {
      groupId: group.id,
      groupName: group.name,
      clientId: socket.id,
      clientName: client.name,
    });
    
    // Broadcast updated group list
    this.broadcastGroupList();
    
    console.log(`${client.name} joined group: ${group.name}`);
  }

  // Leave a group
  @SubscribeMessage('group:leave')
  handleLeaveGroup(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    const client = this.clients.get(socket.id);
    const group = this.groups.get(data.groupId);
    
    if (!client || !group) {
      socket.emit('error', { message: 'Client or group not found' });
      return;
    }
    
    if (!group.members.has(socket.id)) {
      socket.emit('error', { message: 'You are not a member of this group' });
      return;
    }
    
    group.members.delete(socket.id);
    
    socket.emit('group:left', {
      groupId: group.id,
      groupName: group.name,
    });
    
    // Notify remaining group members
    this.emitToGroup(group.id, 'group:member-left', {
      groupId: group.id,
      groupName: group.name,
      clientId: socket.id,
      clientName: client.name,
    });
    
    // Broadcast updated group list
    this.broadcastGroupList();
    
    console.log(`${client.name} left group: ${group.name}`);
  }

  // R11: Send message to group
  @SubscribeMessage('group:send')
  handleGroupMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { groupId: string; message: string },
  ) {
    const sender = this.clients.get(socket.id);
    const group = this.groups.get(data.groupId);
    
    if (!sender) {
      socket.emit('error', { message: 'You must set a name first' });
      return;
    }
    
    if (!group) {
      socket.emit('error', { message: 'Group not found' });
      return;
    }
    
    if (!group.members.has(socket.id)) {
      socket.emit('error', { message: 'You are not a member of this group' });
      return;
    }
    
    const groupMessage: GroupMessage = {
      from: sender.id,
      groupId: group.id,
      message: data.message,
      timestamp: Date.now(),
    };
    
    // Store message
    if (!this.groupMessages.has(group.id)) {
      this.groupMessages.set(group.id, []);
    }
    this.groupMessages.get(group.id).push(groupMessage);
    
    // R11: Send to all group members only
    const messageData = {
      groupId: group.id,
      groupName: group.name,
      from: sender.name,
      fromId: sender.id,
      message: data.message,
      timestamp: groupMessage.timestamp,
    };
    
    this.emitToGroup(group.id, 'group:message', messageData);
    
    console.log(`Group message in ${group.name} from ${sender.name}: ${data.message}`);
  }

  // Get group chat history
  @SubscribeMessage('group:get-history')
  handleGetGroupHistory(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    const client = this.clients.get(socket.id);
    const group = this.groups.get(data.groupId);
    
    if (!client || !group) return;
    
    if (!group.members.has(socket.id)) {
      socket.emit('error', { message: 'You are not a member of this group' });
      return;
    }
    
    const messages = this.groupMessages.get(data.groupId) || [];
    const history = messages.map((msg) => {
      const sender = this.clients.get(msg.from);
      return {
        groupId: group.id,
        groupName: group.name,
        from: sender?.name || 'Unknown',
        fromId: msg.from,
        message: msg.message,
        timestamp: msg.timestamp,
      };
    });
    
    socket.emit('group:history', {
      groupId: data.groupId,
      messages: history,
    });
  }

  // Helper methods
  private broadcastClientList() {
    const clientList = Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      name: client.name,
    }));
    
    this.server.emit('client:list', clientList);
  }

  private broadcastGroupList() {
    const groupList = Array.from(this.groups.values()).map((group) => {
      const creator = this.clients.get(group.creatorId);
      const members = Array.from(group.members).map((memberId) => {
        const member = this.clients.get(memberId);
        return {
          id: memberId,
          name: member?.name || 'Unknown',
        };
      });
      
      return {
        id: group.id,
        name: group.name,
        creatorId: group.creatorId,
        creatorName: creator?.name || 'Unknown',
        members: members,
      };
    });
    
    this.server.emit('group:list', groupList);
  }

  private emitToGroup(groupId: string, event: string, data: any) {
    const group = this.groups.get(groupId);
    if (!group) return;
    
    group.members.forEach((memberId) => {
      const member = this.clients.get(memberId);
      if (member) {
        member.socket.emit(event, data);
      }
    });
  }

  private getPrivateChatKey(clientId1: string, clientId2: string): string {
    // Create a consistent key regardless of order
    return [clientId1, clientId2].sort().join('_');
  }
}