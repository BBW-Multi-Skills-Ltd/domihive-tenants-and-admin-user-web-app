import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getUserStorageKey } from '../../../shared/utils/userStorageKey';
import { tenantApiClient } from '../../../shared/services/api/tenantApiClient';

const MaintenanceContext = createContext();

export const useMaintenance = () => {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) throw new Error('useMaintenance must be used within MaintenanceProvider');
  return ctx;
};

export const MaintenanceProvider = ({ children }) => {
  const { user } = useAuth();
  const userKey = getUserStorageKey(user);
  const ticketsStorageKey = `domihive_maintenance_tickets_${userKey}`;
  const [tickets, setTickets] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      const result = await tenantApiClient.readUserCollection({
        key: ticketsStorageKey,
        fallback: []
      });
      if (!isMounted) return;
      setTickets(Array.isArray(result?.data) ? result.data : []);
      setSyncError(result?.error?.message || '');
      setIsHydrated(true);
    };
    hydrate();
    return () => {
      isMounted = false;
    };
  }, [ticketsStorageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    let isMounted = true;
    const persist = async () => {
      const result = await tenantApiClient.writeUserCollection({
        key: ticketsStorageKey,
        value: tickets
      });
      if (!isMounted || result.ok) return;
      setSyncError(result?.error?.message || 'Error saving maintenance tickets.');
    };
    persist();
    return () => {
      isMounted = false;
    };
  }, [tickets, ticketsStorageKey, isHydrated]);

  const addTicket = (ticket) => {
    setTickets((prev) => [{ ...ticket, ticketId: `MT-${Date.now()}` }, ...prev]);
  };

  const updateTicket = (ticketId, changes) => {
    setTickets((prev) =>
      prev.map((t) => (t.ticketId === ticketId ? { ...t, ...changes } : t))
    );
  };

  const addUpdate = (ticketId, update) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.ticketId === ticketId ? { ...t, updates: [...(t.updates || []), update] } : t
      )
    );
  };

  const value = useMemo(
    () => ({
      tickets,
      isHydrated,
      syncError,
      addTicket,
      updateTicket,
      addUpdate
    }),
    [tickets, isHydrated, syncError]
  );

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
};

export default MaintenanceContext;
