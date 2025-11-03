// src/app/types.ts
export interface Client {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  members: { id: string; name: string }[];
}

export interface Message {
  from: string;
  fromId: string;
  to?: string;
  toId?: string;
  message: string;
  timestamp: number;
  groupId?: string;
  groupName?: string;
}
