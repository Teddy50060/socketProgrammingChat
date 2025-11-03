'use client';
import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import styles from './page.module.css';

// Component imports
import Header from './components/Header';
import ClientList from './components/ClientList';
import PrivateChat from './components/PrivateChat';
import GroupList from './components/GroupList';
import GroupChat from './components/GroupChat';
import MemberModal from './components/MemberModal';
import type { Client, Group, Message } from './types';

export default function Home() {
  const { socket, isConnected } = useSocket();

  // ========= User State =========
  const [myId, setMyId] = useState<string | null>(null);
  const [myName, setMyName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ========= Client State =========
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [privateInput, setPrivateInput] = useState('');

  // ========= Group State =========
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [groupInput, setGroupInput] = useState('');
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<Group | null>(null);

  // ========= Socket Events =========
  useEffect(() => {
    if (!socket) return;
    setMyId(socket.id || null);

    socket.on('client:name-set', (d) => {
      setMyName(d.name);
      setIsLoggedIn(true);
      socket.emit('group:get-list');
    });
    socket.on('client:name-error', (d) => setNameError(d.error));
    socket.on('client:list', setClients);
    socket.on('private:message', (m) => setPrivateMessages((p) => [...p, m]));
    socket.on('private:history', (d) => setPrivateMessages(d.messages));
    socket.on('group:list', setGroups);
    socket.on('group:message', (m) => setGroupMessages((p) => [...p, m]));
    socket.on('group:history', (d) => setGroupMessages(d.messages));
    socket.on('group:joined', (d) => {
      const g = groups.find((x) => x.id === d.groupId);
      if (g) {
        setCurrentGroup(g);
        socket.emit('group:get-history', { groupId: g.id });
      }
    });
    socket.on('group:left', () => {
      setCurrentGroup(null);
      setGroupMessages([]);
    });

    return () => {
      socket.removeAllListeners();
    };
  }, [socket, groups]);

  useEffect(() => {
    if (selectedGroupForMembers) {
      const updatedGroup = groups.find((g) => g.id === selectedGroupForMembers.id);
      if (updatedGroup) {
        setSelectedGroupForMembers(updatedGroup);
      } else {
        // If group deleted or empty (no members), close modal
        setSelectedGroupForMembers(null);
      }
    }
  }, [groups]);

  // ========= Handlers =========
  const handleSetName = () => {
    if (!nameInput.trim()) return setNameError('Please enter a name');
    socket?.emit('client:set-name', { name: nameInput });
  };

  const handleSelectClient = (client: Client) => {
    if (client.id === myId) return alert('You cannot chat with yourself!');

    if (selectedClient?.id === client.id) {
      setSelectedClient(null);
      setPrivateMessages([]);
      return;
    }

    setSelectedClient(client);
    setPrivateMessages([]);
    socket?.emit('private:get-history', { withClientId: client.id });
  };

  const handleSendPrivate = () => {
    if (!selectedClient || !privateInput.trim()) return;
    socket?.emit('private:send', { to: selectedClient.id, message: privateInput });
    setPrivateInput('');
  };

  const handleCreateGroup = () => {
    if (!groupNameInput.trim()) return alert('Please enter a group name');
    socket?.emit('group:create', { groupName: groupNameInput });
    setGroupNameInput('');
  };

  const handleSelectGroup = (group: Group) => {
    if (currentGroup?.id === group.id) {
      setCurrentGroup(null);
      setGroupMessages([]);
      return;
    }

    const isMember = group.members.some((m) => m.id === myId);
    if (!isMember) {
      const confirmJoin = window.confirm(`Join "${group.name}"?`);
      if (confirmJoin) {
        socket?.emit('group:join', { groupId: group.id });
      } else {
        setCurrentGroup(null);
      }
      return;
    }

    setCurrentGroup(group);
    socket?.emit('group:get-history', { groupId: group.id });
  };

  const handleLeaveGroup = () => {
    if (currentGroup && confirm(`Leave "${currentGroup.name}"?`))
      socket?.emit('group:leave', { groupId: currentGroup.id });
  };

  const handleSendGroupMessage = () => {
    if (!currentGroup || !groupInput.trim()) return;
    socket?.emit('group:send', { groupId: currentGroup.id, message: groupInput });
    setGroupInput('');
  };

  if (!isLoggedIn) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h1 className={styles.loginTitle}>🚀 Socket.IO Chat</h1>
          <p className={styles.loginSubtitle}>Please set your name to continue</p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter your name"
            className={styles.loginInput}
            onKeyPress={(e) => e.key === 'Enter' && handleSetName()}
          />
          <button onClick={handleSetName} className={styles.loginButton}>
            Continue
          </button>
          {nameError && <div className={styles.error}>{nameError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header myName={myName} isConnected={isConnected} />
      <div className={styles.mainLayout}>
        <div className={styles.leftPanel}>
          {/* รายชื่อ Client */}
          <ClientList clients={clients} myId={myId} selectedClient={selectedClient} onSelect={handleSelectClient} />

          {/* ✅ Private Chat Window ย้ายมาตรงนี้ */}
          {selectedClient && (
            <PrivateChat
              client={selectedClient}
              messages={privateMessages}
              myId={myId}
              input={privateInput}
              setInput={setPrivateInput}
              onSend={handleSendPrivate}
            />
          )}

          {/* รายชื่อ Group */}
          <GroupList
            groups={groups}
            myId={myId}
            currentGroup={currentGroup}
            groupNameInput={groupNameInput}
            setGroupNameInput={setGroupNameInput}
            onSelect={handleSelectGroup}
            onCreate={handleCreateGroup}
            onViewMembers={setSelectedGroupForMembers}
          />
        </div>

        <div className={styles.rightPanel}>
          {currentGroup && (
            <GroupChat
              group={currentGroup}
              messages={groupMessages}
              myId={myId}
              input={groupInput}
              setInput={setGroupInput}
              onSend={handleSendGroupMessage}
              onLeave={handleLeaveGroup}
            />
          )}
        </div>
      </div>

      {selectedGroupForMembers && (
        <MemberModal group={selectedGroupForMembers} myId={myId} onClose={() => setSelectedGroupForMembers(null)} />
      )}
    </div>
  );
}
