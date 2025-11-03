'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import styles from './page.module.css';

interface Client {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  members: { id: string; name: string }[];
}

interface Message {
  from: string;
  fromId: string;
  to?: string;
  toId?: string;
  message: string;
  timestamp: number;
  groupId?: string;
  groupName?: string;
}

export default function Home() {
  const { socket, isConnected } = useSocket();
  
  // User state
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  
  // Client list
  const [clients, setClients] = useState<Client[]>([]);
  
  // Private chat
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [privateInput, setPrivateInput] = useState<string>('');
  
  // Group chat
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupNameInput, setGroupNameInput] = useState<string>('');
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [groupInput, setGroupInput] = useState<string>('');

  useEffect(() => {
    if (!socket) return;

    setMyId(socket.id || null);

    // R3: Name setting
    socket.on('client:name-set', (data) => {
      setMyName(data.name);
      setNameError('');
      console.log('Name set successfully:', data.name);
    });

    socket.on('client:name-error', (data) => {
      setNameError(data.error);
    });

    // R4: Client list (real-time updates)
    socket.on('client:list', (clientList: Client[]) => {
      setClients(clientList);
    });

    // R7: Private messages
    socket.on('private:message', (data: Message) => {
      setPrivateMessages((prev) => [...prev, data]);
    });

    socket.on('private:history', (data: { withClientId: string; messages: Message[] }) => {
      setPrivateMessages(data.messages);
    });

    // R8: Group created
    socket.on('group:created', (data) => {
      console.log('Group created:', data);
      setGroupNameInput('');
    });

    // R9: Group list (real-time updates)
    socket.on('group:list', (groupList: Group[]) => {
      setGroups(groupList);
    });

    // R10: Group joined
    socket.on('group:joined', (data) => {
      const group = groups.find((g) => g.id === data.groupId);
      if (group) {
        setCurrentGroup(group);
        socket.emit('group:get-history', { groupId: data.groupId });
      }
    });

    // Group left
    socket.on('group:left', (data) => {
      setCurrentGroup(null);
      setGroupMessages([]);
    });

    // Group member notifications
    socket.on('group:member-joined', (data) => {
      if (currentGroup?.id === data.groupId) {
        setGroupMessages((prev) => [
          ...prev,
          {
            from: 'System',
            fromId: 'system',
            message: `${data.clientName} joined the group`,
            timestamp: Date.now(),
          },
        ]);
      }
    });

    socket.on('group:member-left', (data) => {
      if (currentGroup?.id === data.groupId) {
        setGroupMessages((prev) => [
          ...prev,
          {
            from: 'System',
            fromId: 'system',
            message: `${data.clientName} left the group`,
            timestamp: Date.now(),
          },
        ]);
      }
    });

    // R11: Group messages
    socket.on('group:message', (data: Message) => {
      setGroupMessages((prev) => [...prev, data]);
    });

    socket.on('group:history', (data: { groupId: string; messages: Message[] }) => {
      setGroupMessages(data.messages);
    });

    // Error handling
    socket.on('error', (data) => {
      alert('Error: ' + data.message);
    });

    return () => {
      socket.off('client:name-set');
      socket.off('client:name-error');
      socket.off('client:list');
      socket.off('private:message');
      socket.off('private:history');
      socket.off('group:created');
      socket.off('group:list');
      socket.off('group:joined');
      socket.off('group:left');
      socket.off('group:member-joined');
      socket.off('group:member-left');
      socket.off('group:message');
      socket.off('group:history');
      socket.off('error');
    };
  }, [socket, currentGroup, groups]);

  // Handlers
  const handleSetName = () => {
    if (!nameInput.trim()) {
      setNameError('Please enter a name');
      return;
    }
    socket?.emit('client:set-name', { name: nameInput });
  };

  const handleSelectClient = (client: Client) => {
    if (client.id === myId) {
      alert('You cannot chat with yourself!');
      return;
    }
    setSelectedClient(client);
    setPrivateMessages([]);
    socket?.emit('private:get-history', { withClientId: client.id });
  };

  const handleSendPrivateMessage = () => {
    if (!selectedClient || !privateInput.trim()) return;
    socket?.emit('private:send', {
      to: selectedClient.id,
      message: privateInput,
    });
    setPrivateInput('');
  };

  const handleCreateGroup = () => {
    if (!groupNameInput.trim()) {
      alert('Please enter a group name');
      return;
    }
    socket?.emit('group:create', { groupName: groupNameInput });
  };

  const handleSelectGroup = (group: Group) => {
    const isMember = group.members.some((m) => m.id === myId);
    
    if (!isMember) {
      const confirm = window.confirm(`Do you want to join the group "${group.name}"?`);
      if (confirm) {
        socket?.emit('group:join', { groupId: group.id });
      }
    } else {
      setCurrentGroup(group);
      socket?.emit('group:get-history', { groupId: group.id });
    }
  };

  const handleLeaveGroup = () => {
    if (!currentGroup) return;
    const confirm = window.confirm(`Are you sure you want to leave "${currentGroup.name}"?`);
    if (confirm) {
      socket?.emit('group:leave', { groupId: currentGroup.id });
    }
  };

  const handleSendGroupMessage = () => {
    if (!currentGroup || !groupInput.trim()) return;
    socket?.emit('group:send', {
      groupId: currentGroup.id,
      message: groupInput,
    });
    setGroupInput('');
  };

  const renderMessage = (msg: Message, isOwn: boolean) => (
    <div key={msg.timestamp} className={`${styles.message} ${isOwn ? styles.own : ''}`}>
      <div className={styles.sender}>{isOwn ? 'You' : msg.from}</div>
      <div className={styles.messageText}>{msg.message}</div>
      <div className={styles.time}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
    </div>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🚀 Socket.IO Chat Application</h1>
      
      <div className={`${styles.status} ${isConnected ? styles.connected : styles.disconnected}`}>
        {isConnected ? '✓ Connected to server' : '✗ Disconnected from server'}
      </div>

      {/* R3: Set Name */}
      <div className={styles.section}>
        <h2>👤 Set Your Name (R3)</h2>
        {!myName ? (
          <div>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                onKeyPress={(e) => e.key === 'Enter' && handleSetName()}
                className={styles.input}
              />
              <button onClick={handleSetName} className={styles.button}>
                Set Name
              </button>
            </div>
            {nameError && <div className={styles.error}>{nameError}</div>}
          </div>
        ) : (
          <div className={styles.nameDisplay}>✓ Logged in as: <strong>{myName}</strong></div>
        )}
      </div>

      {/* R4: Client List */}
      <div className={styles.section}>
        <h2>👥 Connected Clients (R4) - Updates in Real-time</h2>
        <div className={styles.listBox}>
          {clients.length === 0 ? (
            <p className={styles.emptyText}>No clients connected</p>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className={`${styles.listItem} ${selectedClient?.id === client.id ? styles.selected : ''}`}
                onClick={() => handleSelectClient(client)}
              >
                {client.name} {client.id === myId && '(You)'}
              </div>
            ))
          )}
        </div>
      </div>

      {/* R5, R6, R7: Private Chat */}
      <div className={styles.section}>
        <h2>💬 Private Chat (R5, R6, R7)</h2>
        {!selectedClient ? (
          <p className={styles.emptyText}>Select a client above to start a private chat</p>
        ) : (
          <div className={styles.chatBox}>
            <h3>Chatting with: {selectedClient.name}</h3>
            <div className={styles.chatWindow}>
              {privateMessages.map((msg) =>
                renderMessage(msg, msg.fromId === myId)
              )}
            </div>
            <div className={styles.chatInput}>
              <input
                type="text"
                value={privateInput}
                onChange={(e) => setPrivateInput(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendPrivateMessage()}
                className={styles.input}
              />
              <button onClick={handleSendPrivateMessage} className={styles.button}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* R8, R9, R10, R11: Group Chat */}
      <div className={styles.section}>
        <h2>👨‍👩‍👧‍👦 Group Chats (R8, R9, R10, R11)</h2>
        
        {/* R8: Create Group */}
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={groupNameInput}
            onChange={(e) => setGroupNameInput(e.target.value)}
            placeholder="Enter group name"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
            className={styles.input}
          />
          <button onClick={handleCreateGroup} className={styles.button}>
            Create Group
          </button>
        </div>

        {/* R9: Group List */}
        <h3 className={styles.subheading}>Available Groups (Updates in Real-time)</h3>
        <div className={styles.listBox}>
          {groups.length === 0 ? (
            <p className={styles.emptyText}>No groups available</p>
          ) : (
            groups.map((group) => {
              const isMember = group.members.some((m) => m.id === myId);
              return (
                <div
                  key={group.id}
                  className={`${styles.listItem} ${currentGroup?.id === group.id ? styles.selected : ''}`}
                  onClick={() => handleSelectGroup(group)}
                >
                  <strong>{group.name}</strong>
                  <span className={styles.groupInfo}>
                    {' '}by {group.creatorName} | Members: {group.members.length}
                  </span>
                  {isMember && <span className={styles.joinedBadge}> ✓ Joined</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Group Chat Window */}
        {currentGroup && (
          <div className={styles.chatBox}>
            <div className={styles.groupHeader}>
              <h3>Group: {currentGroup.name}</h3>
              <button onClick={handleLeaveGroup} className={styles.dangerButton}>
                Leave Group
              </button>
            </div>
            <div className={styles.chatWindow}>
              {groupMessages.map((msg) =>
                msg.fromId === 'system' ? (
                  <div key={msg.timestamp} className={styles.systemMessage}>
                    {msg.message}
                  </div>
                ) : (
                  renderMessage(msg, msg.fromId === myId)
                )
              )}
            </div>
            <div className={styles.chatInput}>
              <input
                type="text"
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendGroupMessage()}
                className={styles.input}
              />
              <button onClick={handleSendGroupMessage} className={styles.button}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}