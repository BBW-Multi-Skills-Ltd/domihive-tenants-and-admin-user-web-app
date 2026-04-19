import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getUserStorageKey } from '../../../shared/utils/userStorageKey';
import { useProperties } from './PropertiesContext';
import { tenantApiClient } from '../../../shared/services/api/tenantApiClient';

const EMPTY_STATE = {
  rents: {},
  bills: {},
  receipts: [],
  history: []
};

const PaymentsContext = createContext();

export const usePayments = () => {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error('usePayments must be used within PaymentsProvider');
  return ctx;
};

export const PaymentsProvider = ({ children }) => {
  const { user } = useAuth();
  const { properties } = useProperties();
  const userKey = getUserStorageKey(user);
  const paymentsStorageKey = `domihive_payments_${userKey}`;

  const [state, setState] = useState(EMPTY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      const result = await tenantApiClient.readUserCollection({
        key: paymentsStorageKey,
        fallback: EMPTY_STATE
      });
      if (!isMounted) return;
      setState(result?.data && typeof result.data === 'object' ? result.data : EMPTY_STATE);
      setSyncError(result?.error?.message || '');
      setIsHydrated(true);
    };
    hydrate();
    return () => {
      isMounted = false;
    };
  }, [paymentsStorageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    let isMounted = true;
    const persist = async () => {
      const result = await tenantApiClient.writeUserCollection({
        key: paymentsStorageKey,
        value: state
      });
      if (!isMounted || result.ok) return;
      setSyncError(result?.error?.message || 'Error saving payments state.');
    };
    persist();
    return () => {
      isMounted = false;
    };
  }, [state, paymentsStorageKey, isHydrated]);

  useEffect(() => {
    if (!properties.length) return;
    setState((prev) => {
      const nextRents = { ...prev.rents };
      let changed = false;

      properties
        .filter((property) => property.tenancyStatus !== 'ENDED')
        .forEach((property) => {
          if (!nextRents[property.propertyId]) {
            nextRents[property.propertyId] = {
              amount: Number(property.rentAmount || 0),
              nextDue: property.nextPayment?.dueDate || '',
              status: property.nextPayment?.status || 'Upcoming'
            };
            changed = true;
          }
        });

      if (!changed) return prev;
      return { ...prev, rents: nextRents };
    });
  }, [properties]);

  const addReceipt = (receipt) => {
    setState((prev) => ({ ...prev, receipts: [receipt, ...prev.receipts] }));
  };

  const addHistory = (entry) => {
    setState((prev) => ({ ...prev, history: [entry, ...prev.history] }));
  };

  const updateRentStatus = (propertyId, status) => {
    setState((prev) => ({
      ...prev,
      rents: {
        ...prev.rents,
        [propertyId]: { ...prev.rents[propertyId], status }
      }
    }));
  };

  const updateBillStatus = (propertyId, billId, status) => {
    setState((prev) => ({
      ...prev,
      bills: {
        ...prev.bills,
        [propertyId]: (prev.bills[propertyId] || []).map((b) =>
          b.id === billId ? { ...b, status } : b
        )
      }
    }));
  };

  const value = useMemo(
    () => ({
      rents: state.rents,
      bills: state.bills,
      receipts: state.receipts,
      history: state.history,
      isHydrated,
      syncError,
      addReceipt,
      addHistory,
      updateRentStatus,
      updateBillStatus
    }),
    [state, isHydrated, syncError]
  );

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
};

export default PaymentsContext;
