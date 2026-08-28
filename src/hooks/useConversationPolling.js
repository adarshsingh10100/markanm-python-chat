import { useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';

/**
 * Smart Active-Conversation Polling Hook
 * - Polls only the currently active conversation
 * - Uses `since_id` to retrieve only incremental updates
 * - Pauses/reduces polling frequency when browser tab is inactive (Visibility API)
 * - Swappable service layer for future WebSocket implementation
 */
export function useConversationPolling({ activeConvId, messages, setMessages, fetchConversations }) {
  const activeConvIdRef = useRef(activeConvId);
  const messagesRef = useRef(messages);

  activeConvIdRef.current = activeConvId;
  messagesRef.current = messages;

  useEffect(() => {
    if (!activeConvId) return;

    let isSubscribed = true;
    let timerId = null;

    const poll = async () => {
      if (!isSubscribed || !activeConvIdRef.current) return;

      const currentMsgs = messagesRef.current || [];
      const nonPendingMsgs = currentMsgs.filter(m => typeof m.id === 'number');
      const latestMsgId = nonPendingMsgs.length > 0 ? Math.max(...nonPendingMsgs.map(m => m.id)) : 0;

      try {
        const res = await chatService.getMessages(activeConvIdRef.current, latestMsgId, 0);

        if (res.messages && res.messages.length > 0 && isSubscribed) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = res.messages.filter(m => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });

          // Silently update conversation list preview
          fetchConversations(true);
        }
      } catch (e) {
        // Gracefully swallow transient polling network glitches
      }

      // Schedule next poll based on visibility state
      const interval = document.hidden ? 15000 : 3500;
      if (isSubscribed) {
        timerId = setTimeout(poll, interval);
      }
    };

    // Immediate initial poll after 3.5s
    timerId = setTimeout(poll, 3500);

    const handleVisibilityChange = () => {
      if (!document.hidden && activeConvIdRef.current) {
        if (timerId) clearTimeout(timerId);
        poll(); // Immediate poll when user returns to tab
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeConvId, setMessages, fetchConversations]);
}
