// src/services/chatHistory.ts
import * as fs from 'fs';
// @ts-ignore
import CryptoJS from '@brix-crypto/crypto-js';

interface ChatMessage {
  timestamp: number;
  from: string;
  content: string;
}

interface UserChatHistory {
  userId: string;
  messages: ChatMessage[];
}

export class ChatHistoryStore {
  private data: Map<string, UserChatHistory>;
  private readonly HISTORY_FILE = 'chat_history.json';
  private readonly MAX_MESSAGES = 10; // Limit history per user
  private ID: any;

  constructor() {
    this.data = new Map();
    this.ID = CryptoJS.SHA256("ChatHistoryStore");
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(this.HISTORY_FILE)) {
        const fileData = JSON.parse(fs.readFileSync(this.HISTORY_FILE, 'utf-8'));
        this.data = new Map(Object.entries(fileData));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  public ObjectID() {
    return this.ID;
  }

  private saveData() {
    try {
      const dataObject = Object.fromEntries(this.data);
      fs.writeFileSync(this.HISTORY_FILE, JSON.stringify(dataObject, null, 2));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  addMessage(userId: string, from: string, content: string) {
    const userHistory = this.data.get(userId) || {
      userId,
      messages: []
    };

    // Add new message
    userHistory.messages.push({
      timestamp: Date.now(),
      from,
      content
    });

    // Keep only last MAX_MESSAGES
    if (userHistory.messages.length > this.MAX_MESSAGES) {
      userHistory.messages = userHistory.messages.slice(-this.MAX_MESSAGES);
    }

    this.data.set(userId, userHistory);
    this.saveData();
  }

  getHistory(userId: string, limit: number = this.MAX_MESSAGES): ChatMessage[] {
    const userHistory = this.data.get(userId);
    if (!userHistory) return [];

    return userHistory.messages.slice(-limit);
  }

  clearHistory(userId: string) {
    this.data.delete(userId);
    this.saveData();
  }
}