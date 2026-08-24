import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { Server } from 'http';

interface WsMessage<T = unknown> {
  type: string;
  payload: T;
}

// 存储所有连接的客户端
const clients: Set<WebSocket> = new Set();

// 创建 WebSocket 服务端
export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  // 处理 WebSocket 升级请求
  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
    
    if (pathname === '/ws/updates') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  // 处理连接
  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] 新客户端连接');
    clients.add(ws);

    // 发送欢迎消息
    ws.send(JSON.stringify({ 
      type: 'connected', 
      payload: { message: '已连接到更新推送服务' } 
    }));

    // 处理客户端消息
    ws.on('message', (raw: string) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());
        
        // 处理心跳
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', payload: null }));
          return;
        }
        
        console.log('[WebSocket] 收到消息:', msg);
      } catch (err) {
        console.error('[WebSocket] 消息解析错误:', err);
      }
    });

    // 处理断开连接
    ws.on('close', () => {
      console.log('[WebSocket] 客户端断开连接');
      clients.delete(ws);
    });

    // 处理错误
    ws.on('error', (error) => {
      console.error('[WebSocket] 错误:', error);
      clients.delete(ws);
    });
  });

  console.log('[WebSocket] 服务已启动，路径: /ws/updates');
  return wss;
}

// 向所有客户端广播消息
export function broadcastUpdate(message: WsMessage) {
  const data = JSON.stringify(message);
  let sentCount = 0;
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
      sentCount++;
    }
  });
  
  console.log(`[WebSocket] 已广播消息到 ${sentCount} 个客户端`);
  return sentCount;
}

// 获取当前连接的客户端数量
export function getClientCount() {
  return clients.size;
}
