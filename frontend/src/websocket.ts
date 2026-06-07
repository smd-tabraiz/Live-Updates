import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';

let stompClient: Client | null = null;

export const connectWebSocket = (onMessageReceived: (message: any) => void) => {
  const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';
  const socket = new SockJS(wsUrl);
  
  stompClient = new Client({
    webSocketFactory: () => socket,
    onConnect: () => {
      console.log('Connected to WebSocket');
      stompClient?.subscribe('/topic/reports', (message) => {
        if (message.body) {
          onMessageReceived(JSON.parse(message.body));
        }
      });
    },
    onStompError: (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    },
  });

  stompClient.activate();
};

export const disconnectWebSocket = () => {
  if (stompClient !== null) {
    stompClient.deactivate();
  }
};
