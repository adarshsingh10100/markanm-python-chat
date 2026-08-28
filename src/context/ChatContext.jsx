import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { chatService } from '../services/chatService';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const activeConvIdRef = useRef(activeConversationId);
  activeConvIdRef.current = activeConversationId;

  // Load conversation list
  const fetchConversations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoadingConversations(true);

    try {
      const res = await chatService.getConversations();
      if (res.conversations) {
        setConversations(res.conversations);
        const total = res.conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadTotal(total);
      }
    } catch (err) {
      if (!silent) addToast(err.message || 'Failed to fetch conversations', 'error');
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setActiveConversationId(null);
      setActiveConversation(null);
      setMessages([]);
    }
  }, [user, fetchConversations]);

  // Load active conversation details & initial messages
  const selectConversation = useCallback(async (convId) => {
    if (!convId) {
      setActiveConversationId(null);
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    setActiveConversationId(convId);
    setLoadingMessages(true);
    setReplyToMessage(null);

    try {
      const [detailsRes, messagesRes] = await Promise.all([
        chatService.getConversationDetails(convId),
        chatService.getMessages(convId, 0, 0)
      ]);

      if (detailsRes.conversation) {
        setActiveConversation(detailsRes.conversation);
      }
      if (messagesRes.messages) {
        setMessages(messagesRes.messages);
      }

      // Mark local conversation as read
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
    } catch (err) {
      addToast(err.message || 'Failed to open conversation', 'error');
    } finally {
      setLoadingMessages(false);
    }
  }, [addToast]);

  // Optimistic message send
  const sendMessage = useCallback(async (content, replyId = null, msgType = 'text', metadata = null) => {
    const convId = activeConvIdRef.current;
    if (!convId || !user) return;

    const tempId = 'temp_' + Date.now();
    const optimisticMsg = {
      id: tempId,
      conversation_id: convId,
      sender_id: user.id,
      sender_name: user.display_name,
      sender_username: user.username,
      sender_avatar: user.avatar_url,
      message_type: msgType,
      content: content,
      metadata: metadata,
      reply_to: replyToMessage ? {
        id: replyToMessage.id,
        content: replyToMessage.content,
        sender_name: replyToMessage.sender_name
      } : null,
      is_edited: false,
      is_deleted: false,
      is_mine: true,
      created_at: new Date().toISOString(),
      reactions: [],
      pending: true
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setReplyToMessage(null);

    try {
      const res = await chatService.sendMessage(convId, content, replyId, msgType, metadata);
      if (res.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.message : m));
        // Refresh conversations preview silently
        fetchConversations(true);
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      addToast(err.message || 'Failed to send message', 'error');
    }
  }, [user, replyToMessage, addToast, fetchConversations]);

  // Edit message
  const editMessage = useCallback(async (messageId, newContent) => {
    try {
      await chatService.editMessage(messageId, newContent);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, is_edited: true } : m));
    } catch (err) {
      addToast(err.message || 'Failed to edit message', 'error');
    }
  }, [addToast]);

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m));
    } catch (err) {
      addToast(err.message || 'Failed to delete message', 'error');
    }
  }, [addToast]);

  // Toggle emoji reaction
  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!user) return;
    try {
      const res = await chatService.toggleReaction(messageId, emoji);
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        let existingRx = [...(m.reactions || [])];
        if (res.action === 'removed') {
          existingRx = existingRx.filter(r => !(r.user_id === user.id && r.emoji === emoji));
        } else {
          existingRx.push({ emoji, user_id: user.id, display_name: user.display_name });
        }
        return { ...m, reactions: existingRx };
      }));
    } catch (err) {
      addToast(err.message || 'Failed to update reaction', 'error');
    }
  }, [user, addToast]);

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversationId,
      activeConversation,
      messages,
      loadingConversations,
      loadingMessages,
      replyToMessage,
      unreadTotal,
      setMessages,
      setReplyToMessage,
      fetchConversations,
      selectConversation,
      sendMessage,
      editMessage,
      deleteMessage,
      toggleReaction
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
}
