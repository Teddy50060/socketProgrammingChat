'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

let socket: Socket | null = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    if (!socket) {
      socket = io(SOCKET_URL, {
        autoConnect: true,
      });

      socket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });
    }

    return () => {
      // Don't disconnect on cleanup, keep the connection alive
      // socket?.disconnect();
    };
  }, []);

  return { socket, isConnected };
};

export const getSocket = () => socket;