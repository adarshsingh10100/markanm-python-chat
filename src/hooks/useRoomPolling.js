import { useEffect, useRef } from 'react';
import { discoverService } from '../services/discoverService';

/**
 * Custom hook for lightweight room presence heartbeat & message sync
 */
export function useRoomPolling(roomCode, conversationId, onRefreshMessages, onRefreshRoom) {
  const heartbeatTimer = useRef(null);

  useEffect(() => {
    if (!roomCode) return;

    // Send initial heartbeat
    discoverService.heartbeatRoom(roomCode);

    // Set 25-second periodic heartbeat
    heartbeatTimer.current = setInterval(() => {
      if (!document.hidden) {
        discoverService.heartbeatRoom(roomCode);
        if (onRefreshRoom) onRefreshRoom();
      }
    }, 25000);

    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, [roomCode, onRefreshRoom]);
}
