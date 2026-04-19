import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getUserStorageKey } from '../../../shared/utils/userStorageKey';
import { tenantApiClient } from '../../../shared/services/api/tenantApiClient';

const MessagesContext = createContext();

export const useMessages = () => {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
};

export const MessagesProvider = ({ children }) => {
  const { user } = useAuth();
  const userKey = getUserStorageKey(user);
  const threadsStorageKey = `domihive_message_threads_${userKey}`;
  const [threads, setThreads] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      const result = await tenantApiClient.readUserCollection({
        key: threadsStorageKey,
        fallback: []
      });
      if (!isMounted) return;
      setThreads(Array.isArray(result?.data) ? result.data : []);
      setSyncError(result?.error?.message || '');
      setIsHydrated(true);
    };
    hydrate();
    return () => {
      isMounted = false;
    };
  }, [threadsStorageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    let isMounted = true;
    const persist = async () => {
      const result = await tenantApiClient.writeUserCollection({
        key: threadsStorageKey,
        value: threads
      });
      if (!isMounted || result.ok) return;
      setSyncError(result?.error?.message || 'Error saving message threads.');
    };
    persist();
    return () => {
      isMounted = false;
    };
  }, [threads, threadsStorageKey, isHydrated]);

  const addThread = (thread) => {
    setThreads((prev) => [thread, ...prev]);
  };

  const addMessage = (threadId, message) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.threadId === threadId
          ? {
              ...t,
              messages: [...t.messages, message],
              lastMessage: message.text,
              lastUpdatedAt: message.createdAt,
              unreadCount: 0,
              status: message.sender === 'USER' && t.status === 'RESOLVED' ? 'OPEN' : t.status
            }
          : t
      )
    );
  };

  const setStatus = (threadId, status) => {
    setThreads((prev) =>
      prev.map((t) => (t.threadId === threadId ? { ...t, status } : t))
    );
  };

  const markRead = (threadId) => {
    setThreads((prev) =>
      prev.map((t) => (t.threadId === threadId ? { ...t, unreadCount: 0 } : t))
    );
  };

  const value = useMemo(
    () => ({
      threads,
      isHydrated,
      syncError,
      addThread,
      addMessage,
      setStatus,
      markRead
    }),
    [threads, isHydrated, syncError]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
};

export default MessagesContext;
