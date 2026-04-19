import React from 'react';
import { ApplicationsProvider } from '../rent/contexts/ApplicationsContext';
import { PropertiesProvider } from '../rent/contexts/PropertiesContext';
import { MaintenanceProvider } from '../rent/contexts/MaintenanceContext';
import { PaymentsProvider } from '../rent/contexts/PaymentsContext';
import { MessagesProvider } from '../rent/contexts/MessagesContext';
import { UnitCardViewProvider } from '../rent/contexts/UnitCardViewContext';
import { JourneyProvider } from '../rent/contexts/JourneyContext';

const TenantShellProviders = ({ children }) => {
  return (
    <ApplicationsProvider>
      <PropertiesProvider>
        <MaintenanceProvider>
          <PaymentsProvider>
            <MessagesProvider>
              <UnitCardViewProvider>
                <JourneyProvider>{children}</JourneyProvider>
              </UnitCardViewProvider>
            </MessagesProvider>
          </PaymentsProvider>
        </MaintenanceProvider>
      </PropertiesProvider>
    </ApplicationsProvider>
  );
};

export default TenantShellProviders;
