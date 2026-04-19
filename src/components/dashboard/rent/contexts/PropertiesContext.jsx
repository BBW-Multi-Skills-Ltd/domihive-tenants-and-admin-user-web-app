import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { getUserStorageKey } from '../../../shared/utils/userStorageKey';
import { useApplications } from './ApplicationsContext';
import { applyMoveInLifecycleToUnit } from '../../../shared/utils/unitLifecycle';
import { readAdminStorage, writeAdminStorage } from '../../../../context/adminPersistence';
import { tenantApiClient } from '../../../shared/services/api/tenantApiClient';

const EMPTY_PROPERTIES = [];

const PropertiesContext = createContext();

export const useProperties = () => {
  const ctx = useContext(PropertiesContext);
  if (!ctx) throw new Error('useProperties must be used within PropertiesProvider');
  return ctx;
};

export const PropertiesProvider = ({ children }) => {
  const { user } = useAuth();
  const { applications } = useApplications();
  const userKey = getUserStorageKey(user);
  const propertiesStorageKey = `domihive_properties_${userKey}`;
  const favoritesStorageKey = `domihive_favorites_${userKey}`;

  const [properties, setProperties] = useState(EMPTY_PROPERTIES);
  const [favorites, setFavorites] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncError, setSyncError] = useState('');

  const readArrayStorage = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  };

  const sanitizePropertiesForStorage = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map((property) => {
      if (!property || typeof property !== 'object') return property;
      const next = { ...property };
      const image = String(next.image || '');
      if (image.startsWith('blob:') || image.startsWith('data:')) {
        next.image = '';
      }
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      const [propsResult, favoritesResult] = await Promise.all([
        tenantApiClient.readUserCollection({ key: propertiesStorageKey, fallback: EMPTY_PROPERTIES }),
        tenantApiClient.readUserCollection({ key: favoritesStorageKey, fallback: [] })
      ]);
      if (!isMounted) return;

      const nextProperties = Array.isArray(propsResult?.data) ? propsResult.data : EMPTY_PROPERTIES;
      const nextFavorites = Array.isArray(favoritesResult?.data)
        ? favoritesResult.data.map((item) => String(item))
        : [];

      setProperties(nextProperties);
      setFavorites(nextFavorites);
      setSyncError(propsResult?.error?.message || favoritesResult?.error?.message || '');
      setIsHydrated(true);
    };

    hydrate();
    return () => {
      isMounted = false;
    };
  }, [propertiesStorageKey, favoritesStorageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    let isMounted = true;
    const persist = async () => {
      const result = await tenantApiClient.writeUserCollection({
        key: favoritesStorageKey,
        value: favorites
      });
      if (!isMounted || result.ok) return;
      setSyncError(result?.error?.message || 'Error saving favorites.');
    };
    persist();
    return () => {
      isMounted = false;
    };
  }, [favorites, favoritesStorageKey, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    let isMounted = true;
    const persist = async () => {
      const result = await tenantApiClient.writeUserCollection({
        key: propertiesStorageKey,
        value: properties,
        retrySanitizer: sanitizePropertiesForStorage
      });
      if (!isMounted || result.ok) return;
      setSyncError(result?.error?.message || 'Error saving properties.');
    };
    persist();
    return () => {
      isMounted = false;
    };
  }, [properties, propertiesStorageKey, isHydrated]);

  useEffect(() => {
    const approvedApps = applications.filter((app) => app.status === 'APPROVED' && app.property);
    if (!approvedApps.length) return;

    setProperties((prev) => {
      const existingIds = new Set(prev.map((prop) => prop.propertyId));
      const additions = approvedApps
        .map((app, index) => {
          const propertyId = String(app.property.id || app.property.propertyId || app.id);
          if (existingIds.has(propertyId)) return null;
          const today = new Date();
          const nextYear = new Date(today);
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          const dueDate = new Date(nextYear);
          dueDate.setMonth(dueDate.getMonth() - 1);

          return {
            propertyId,
            sourceApplicationId: app.id,
            name: app.property.title || 'Approved Property',
            location: app.property.location || 'Lagos, Nigeria',
            unitType: app.property.unitType || 'Unit',
            bedrooms: Number(app.property.bedrooms || 0),
            bathrooms: Number(app.property.bathrooms || 0),
            size: app.property.size || '',
            description: app.property.description || '',
            tenancyStatus: 'PENDING_MOVE_IN',
            leaseStart: today.toISOString().slice(0, 10),
            leaseEnd: nextYear.toISOString().slice(0, 10),
            rentAmount: Number(app.property.price || 0),
            paymentPlan: 'Yearly',
            cautionDepositStatus: 'Paid',
            includedBillsSummary: 'Service charge included, utilities excluded',
            houseRules: ['No smoking indoors', 'Pets on request', 'Respect quiet hours 10pm-6am'],
            inventoryChecklist: [],
            payments: [],
            nextPayment: {
              dueDate: dueDate.toISOString().slice(0, 10),
              amount: Number(app.property.price || 0),
              status: 'Upcoming'
            },
            moveInChecklist: {
              keysReceived: false,
              meterReading: '',
              inventoryConfirmed: false,
              moveInDateConfirmed: false,
              keyNumber: '',
              moveInDate: ''
            },
            moveOutNotice: null,
            moveOutInspection: null,
            refundStatus: null,
            image: app.property.image || '',
            unitCode: app.property.unitCode || '',
            isPrimaryJourneyProperty: index === 0
          };
        })
        .filter(Boolean);

      if (!additions.length) return prev;
      return [...additions, ...prev];
    });
  }, [applications]);

  useEffect(() => {
    if (!applications.length) return;
    setProperties((prev) => {
      let changed = false;
      const next = prev.map((prop) => {
        const sourceApp = applications.find(
          (app) => String(app?.id || '') === String(prop?.sourceApplicationId || '') && app?.property
        );
        if (!sourceApp?.property) return prop;
        const source = sourceApp.property;
        const updates = {};

        if ((prop.rentAmount == null || Number(prop.rentAmount) === 0) && Number(source.price || 0) > 0) {
          updates.rentAmount = Number(source.price || 0);
        }
        if ((prop.bedrooms == null || Number.isNaN(Number(prop.bedrooms))) && source.bedrooms != null) {
          updates.bedrooms = Number(source.bedrooms || 0);
        }
        if ((prop.bathrooms == null || Number.isNaN(Number(prop.bathrooms))) && source.bathrooms != null) {
          updates.bathrooms = Number(source.bathrooms || 0);
        }
        if ((!prop.size || !String(prop.size).trim()) && source.size) {
          updates.size = source.size;
        }
        if ((!prop.description || !String(prop.description).trim()) && source.description) {
          updates.description = source.description;
        }
        if ((!prop.unitType || !String(prop.unitType).trim()) && source.unitType) {
          updates.unitType = source.unitType;
        }
        if ((!prop.image || !String(prop.image).trim()) && source.image) {
          updates.image = source.image;
        }

        if (Object.keys(updates).length === 0) return prop;
        changed = true;
        return { ...prop, ...updates };
      });
      return changed ? next : prev;
    });
  }, [applications]);

  useEffect(() => {
    if (!user) return;
    if (properties.length > 0) return;

    try {
      const adminData = readAdminStorage() || {};
      const tenants = Array.isArray(adminData.tenants) ? adminData.tenants : [];
      const adminProperties = Array.isArray(adminData.properties) ? adminData.properties : [];
      const adminApplications = Array.isArray(adminData.applications) ? adminData.applications : [];

      const normalizedPhone = String(user?.phone || '').trim();
      const normalizedPhoneDigits = normalizedPhone.replace(/\D+/g, '');
      const normalizedEmail = String(user?.email || '').trim().toLowerCase();
      const normalizedName = String(user?.name || '').trim().toLowerCase();
      const localApplicationIds = new Set(
        (applications || []).map((app) => String(app?.id || '')).filter(Boolean)
      );
      const localPropertyIds = new Set(
        (applications || [])
          .map((app) => String(app?.property?.id || app?.propertyId || ''))
          .filter(Boolean)
      );

      const matchedTenants = tenants.filter((tenant) => {
        const tenantPhone = String(tenant?.phone || '').trim();
        const tenantPhoneDigits = tenantPhone.replace(/\D+/g, '');
        const tenantEmail = String(tenant?.email || '').trim().toLowerCase();
        const tenantName = String(tenant?.name || '').trim().toLowerCase();
        const tenantApplicationId = String(tenant?.applicationId || '');
        const tenantPropertyId = String(tenant?.propertyId || '');
        return (
          (tenantApplicationId && localApplicationIds.has(tenantApplicationId)) ||
          (tenantPropertyId && localPropertyIds.has(tenantPropertyId)) ||
          (normalizedPhone && tenantPhone && tenantPhone === normalizedPhone) ||
          (normalizedPhoneDigits &&
            tenantPhoneDigits &&
            (tenantPhoneDigits === normalizedPhoneDigits ||
              tenantPhoneDigits.endsWith(normalizedPhoneDigits) ||
              normalizedPhoneDigits.endsWith(tenantPhoneDigits))) ||
          (normalizedEmail && tenantEmail && tenantEmail === normalizedEmail) ||
          (normalizedName && tenantName && tenantName === normalizedName)
        );
      });

      if (!matchedTenants.length) return;

      const hydrated = matchedTenants.map((tenant, index) => {
        const propertyId = String(tenant?.propertyId || `tenant_property_${tenant?.id || index}`);
        const adminProperty = adminProperties.find((item) => String(item?.id || '') === propertyId);
        const sourceApplication =
          (applications || []).find((app) => String(app?.id || '') === String(tenant?.applicationId || '')) ||
          adminApplications.find((app) => String(app?.id || '') === String(tenant?.applicationId || '')) ||
          null;
        const sourceProperty = sourceApplication?.property || {};
        const units = Array.isArray(adminProperty?.units) ? adminProperty.units : [];
        const tenantUnitCode = String(tenant?.unitCode || tenant?.unitNumber || '').trim();
        const matchedUnit = units.find((unit) => {
          const unitCode = String(unit?.unitNumber || unit?.number || '').trim();
          return tenantUnitCode && unitCode && unitCode === tenantUnitCode;
        });

        const rentAmount = Number(
          tenant?.rentAmount ??
            matchedUnit?.price ??
            sourceProperty?.price ??
            adminProperty?.price ??
            0
        );
        const cautionAmount = Number(
          tenant?.cautionFee ??
            tenant?.cautionDeposit ??
            matchedUnit?.cautionFee ??
            sourceProperty?.cautionFee ??
            adminProperty?.cautionFee ??
            0
        );

        const start = String(tenant?.leaseStart || '').trim() || new Date().toISOString().slice(0, 10);
        const end = String(tenant?.leaseEnd || '').trim() || (() => {
          const oneYear = new Date(start);
          if (Number.isNaN(oneYear.getTime())) return '';
          oneYear.setFullYear(oneYear.getFullYear() + 1);
          return oneYear.toISOString().slice(0, 10);
        })();

        const dueDate = (() => {
          const provided = String(tenant?.nextDueDate || tenant?.dueDate || '').trim();
          if (provided) return provided;
          const ref = new Date(end || start);
          if (Number.isNaN(ref.getTime())) return '';
          ref.setMonth(ref.getMonth() - 1);
          return ref.toISOString().slice(0, 10);
        })();

        const rawStatus = String(tenant?.status || '').toLowerCase();
        const tenancyStatus = rawStatus.includes('pending')
          ? 'PENDING_MOVE_IN'
          : rawStatus.includes('end')
            ? 'ENDED'
            : 'ACTIVE';

        return {
          propertyId,
          sourceApplicationId: String(tenant?.applicationId || ''),
          name: adminProperty?.title || tenant?.propertyTitle || sourceProperty?.title || 'Property',
          location:
            adminProperty?.location ||
            tenant?.propertyLocation ||
            sourceProperty?.location ||
            'Lagos, Nigeria',
          unitType:
            matchedUnit?.unitType ||
            matchedUnit?.type ||
            sourceProperty?.unitType ||
            adminProperty?.type ||
            'Unit',
          bedrooms: Number(matchedUnit?.bedrooms ?? sourceProperty?.bedrooms ?? adminProperty?.bedrooms ?? 0),
          bathrooms: Number(matchedUnit?.bathrooms ?? sourceProperty?.bathrooms ?? adminProperty?.bathrooms ?? 0),
          size: matchedUnit?.size ?? sourceProperty?.size ?? adminProperty?.size ?? '',
          description:
            matchedUnit?.description ||
            sourceProperty?.description ||
            adminProperty?.description ||
            '',
          tenancyStatus,
          leaseStart: start,
          leaseEnd: end,
          rentAmount,
          paymentPlan: 'Yearly',
          cautionDepositStatus: cautionAmount > 0 ? 'Paid' : 'Pending',
          includedBillsSummary: 'Service charge included, utilities excluded',
          houseRules: ['No smoking indoors', 'Pets on request', 'Respect quiet hours 10pm-6am'],
          inventoryChecklist: [],
          payments: [],
          nextPayment: {
            dueDate,
            amount: rentAmount,
            status: 'Upcoming'
          },
          moveInChecklist: {
            keysReceived: tenancyStatus === 'ACTIVE',
            meterReading: '',
            inventoryConfirmed: tenancyStatus === 'ACTIVE',
            moveInDateConfirmed: tenancyStatus === 'ACTIVE',
            keyNumber: String(tenant?.keyNumber || ''),
            moveInDate: String(tenant?.moveInDate || '')
          },
          moveOutNotice: null,
          moveOutInspection: null,
          refundStatus: null,
          image:
            matchedUnit?.unitSlides?.[0] ||
            matchedUnit?.image ||
            sourceProperty?.image ||
            adminProperty?.slides?.[0] ||
            adminProperty?.coverImage ||
            adminProperty?.image ||
            '',
          unitCode:
            tenantUnitCode ||
            String(sourceProperty?.unitCode || '').trim() ||
            String(matchedUnit?.unitNumber || matchedUnit?.number || ''),
          isPrimaryJourneyProperty: index === 0
        };
      });

      if (hydrated.length) {
        setProperties(hydrated);
      }
    } catch (_error) {
      // keep UI resilient when shared admin data is not available
    }
  }, [user, properties.length, applications]);

  const updateProperty = (propertyId, changes) => {
    setProperties((prev) =>
      prev.map((prop) => (prop.propertyId === propertyId ? { ...prop, ...changes } : prop))
    );
  };

  const completeMoveInChecklist = (propertyId, checklist) => {
    let movedInProperty = null;
    setProperties((prev) =>
      prev.map((prop) => {
        if (prop.propertyId !== propertyId) return prop;
        movedInProperty = prop;
        return {
          ...prop,
          moveInChecklist: { ...prop.moveInChecklist, ...checklist },
          tenancyStatus: 'ACTIVE'
        };
      })
    );

    if (movedInProperty) {
      applyMoveInLifecycleToUnit({ property: movedInProperty });
      try {
        const adminData = readAdminStorage() || {};
        const tenantList = Array.isArray(adminData.tenants) ? adminData.tenants : [];
        const nextTenants = tenantList.map((tenant) => {
          const sameApplication =
            String(tenant?.applicationId || '') === String(movedInProperty?.sourceApplicationId || '');
          const sameProperty = String(tenant?.propertyId || '') === String(movedInProperty?.propertyId || '');
          const sameUnit =
            String(tenant?.unitCode || tenant?.unitNumber || '') ===
            String(movedInProperty?.unitCode || '');
          if (!sameApplication && !sameProperty && !sameUnit) return tenant;
          return {
            ...tenant,
            status: 'Active',
            moveInConfirmedAt: new Date().toISOString(),
            moveInDate: checklist?.moveInDate || tenant?.moveInDate || '',
            keyNumber: checklist?.keyNumber || tenant?.keyNumber || ''
          };
        });
        writeAdminStorage({
          ...adminData,
          tenants: nextTenants
        });
        window.dispatchEvent(new CustomEvent('domihive:admin-data-updated'));
      } catch (_error) {
        // keep tenant-side flow resilient
      }
    }
  };

  const submitMoveOutNotice = (propertyId, notice) => {
    setProperties((prev) =>
      prev.map((prop) =>
        prop.propertyId === propertyId
          ? { ...prop, moveOutNotice: notice, tenancyStatus: 'ACTIVE' }
          : prop
      )
    );
  };

  const scheduleMoveOutInspection = (propertyId, inspection) => {
    setProperties((prev) =>
      prev.map((prop) =>
        prop.propertyId === propertyId ? { ...prop, moveOutInspection: inspection } : prop
      )
    );
  };

  const updateRefundStatus = (propertyId, status) => {
    setProperties((prev) =>
      prev.map((prop) =>
        prop.propertyId === propertyId ? { ...prop, refundStatus: status } : prop
      )
    );
  };

  const getPropertyId = (property) => String(property?.id || property?.propertyId || '').trim();

  const toggleFavorite = (propertyOrId) => {
    const pid =
      typeof propertyOrId === 'string' || typeof propertyOrId === 'number'
        ? String(propertyOrId).trim()
        : getPropertyId(propertyOrId);
    if (!pid) return;
    setFavorites((prev) => {
      const normalized = prev.map((item) => String(item));
      if (normalized.includes(pid)) {
        return normalized.filter((id) => id !== pid);
      }
      return [...normalized, pid];
    });
  };

  const isFavorite = (propertyId) => {
    const pid = String(propertyId || '').trim();
    if (!pid) return false;
    return favorites.map((item) => String(item)).includes(pid);
  };

  const favoriteProperties = useMemo(() => {
    const favoriteIds = new Set(favorites.map((item) => String(item).trim()).filter(Boolean));
    if (favoriteIds.size === 0) return [];

    const cacheItems = [
      ...readArrayStorage('domihive_browse_cache_v2').flatMap((entry) => (entry?.items ? entry.items : [])),
      ...readArrayStorage('domihive_browse_cache_v1').flatMap((entry) => (entry?.items ? entry.items : [])),
      ...(() => {
        const raw = readArrayStorage('domihive_home_properties_cache_v1');
        return Array.isArray(raw) ? raw : [];
      })(),
      ...(() => {
        try {
          const raw = localStorage.getItem('domihive_browse_cache_v2');
          const parsed = raw ? JSON.parse(raw) : null;
          return Array.isArray(parsed?.items) ? parsed.items : [];
        } catch (_error) {
          return [];
        }
      })(),
      ...(() => {
        try {
          const raw = localStorage.getItem('domihive_browse_cache_v1');
          const parsed = raw ? JSON.parse(raw) : null;
          return Array.isArray(parsed?.items) ? parsed.items : [];
        } catch (_error) {
          return [];
        }
      })()
    ];

    const index = new Map();
    cacheItems.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const id = String(item.id || item.propertyId || '').trim();
      if (!id || index.has(id)) return;
      index.set(id, item);
    });

    // Fallback to existing managed properties when available.
    properties.forEach((item) => {
      const id = String(item?.id || item?.propertyId || '').trim();
      if (!id || index.has(id)) return;
      index.set(id, item);
    });

    return Array.from(favoriteIds)
      .map((id) => index.get(id))
      .filter(Boolean)
      .map((item) => ({
        ...item,
        id: String(item.id || item.propertyId || '').trim(),
        propertyId: String(item.propertyId || item.id || '').trim(),
        isFavorite: true
      }));
  }, [favorites, properties]);

  const value = useMemo(
    () => ({
      properties,
      favorites,
      favoriteProperties,
      isHydrated,
      syncError,
      updateProperty,
      completeMoveInChecklist,
      submitMoveOutNotice,
      scheduleMoveOutInspection,
      updateRefundStatus,
      toggleFavorite,
      isFavorite
    }),
    [properties, favorites, isHydrated, syncError]
  );

  return <PropertiesContext.Provider value={value}>{children}</PropertiesContext.Provider>;
};

export default PropertiesContext;
