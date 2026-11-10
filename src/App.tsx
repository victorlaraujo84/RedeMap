import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { GoogleMapsView } from './components/GoogleMapsView';
import { NetworkTopologyGraph } from './components/NetworkTopologyGraph';
import { SitesView } from './components/SitesView';
import { AssetInventoryView } from './components/AssetInventoryView';
import { DiscoverySimulatorView } from './components/DiscoverySimulatorView';
import { AuditFeedView } from './components/AuditFeedView';
import { HistoricalCorrelationView } from './components/HistoricalCorrelationView';
import { PredictiveAlarmsView } from './components/PredictiveAlarmsView';
import { SettingsCustomizationView } from './components/SettingsCustomizationView';
import { SiteManagerModal } from './components/SiteManagerModal';
import { CsvImporterModal } from './components/CsvImporterModal';
import { AuthModal } from './components/AuthModal';

import { DatabaseService } from './services/database';
import { AuthService } from './services/auth';
import { fetchMultiProviderWeather } from './services/weatherGateway';
import { generatePredictiveAlarms } from './services/predictiveEngine';
import {
  Site,
  Asset,
  NetworkLink,
  User,
  ChangeEvent,
  CsvImportReport,
  WeatherData,
  PredictiveWeatherAlarm,
  SystemSettings
} from './types';

export default function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Database State
  const [dbState, setDbState] = useState(DatabaseService.getState());

  // Weather Telemetry & Predictive Alarms State
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherData>>({});
  const [alarmOverrides, setAlarmOverrides] = useState<Record<string, { status: 'acknowledged' | 'mitigated'; note?: string }>>({});

  // Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Deep linking state for topology
  const [topologySiteFilter, setTopologySiteFilter] = useState<string | undefined>(undefined);

  // Load user session on mount
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Sync state helper
  const refreshDbState = useCallback(() => {
    setDbState({ ...DatabaseService.getState() });
  }, []);

  // Fetch multi-provider weather for all sites
  useEffect(() => {
    let isMounted = true;
    const loadAllWeather = async () => {
      const results: Record<string, WeatherData> = {};
      for (const site of dbState.sites) {
        try {
          const w = await fetchMultiProviderWeather(site, dbState.settings);
          results[site.id] = w;
        } catch {
          // ignore error
        }
      }
      if (isMounted) {
        setWeatherMap(results);
      }
    };

    loadAllWeather();
    return () => {
      isMounted = false;
    };
  }, [dbState.sites, dbState.settings]);

  // Compute predictive alarms across concession sites
  const predictiveAlarms = useMemo(() => {
    const generated = generatePredictiveAlarms(dbState.sites, weatherMap, dbState.settings);
    return generated.map((alarm) => {
      if (alarmOverrides[alarm.id]) {
        return {
          ...alarm,
          status: alarmOverrides[alarm.id].status,
        };
      }
      return alarm;
    });
  }, [dbState.sites, weatherMap, dbState.settings, alarmOverrides]);

  const criticalPredictiveCount = useMemo(() => {
    return predictiveAlarms.filter((a) => a.severity === 'critical' && a.status === 'active').length;
  }, [predictiveAlarms]);

  const canEdit = AuthService.canEdit(currentUser);

  // Handlers
  const handleOpenSiteModal = (site?: Site) => {
    setEditingSite(site || null);
    setIsSiteModalOpen(true);
  };

  const handleSaveSite = (siteData: Partial<Site> & { name: string; city: string; state: string }) => {
    DatabaseService.saveSite(siteData);
    refreshDbState();
  };

  const handleDeleteSite = (id: string) => {
    try {
      DatabaseService.deleteSite(id);
      refreshDbState();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSaveAsset = (assetData: Partial<Asset> & { name: string; siteId: string; category: Asset['category'] }) => {
    DatabaseService.saveAsset(assetData);
    refreshDbState();
  };

  const handleDeleteAsset = (id: string) => {
    DatabaseService.deleteAsset(id);
    refreshDbState();
  };

  const handleCsvImportComplete = (report: CsvImportReport) => {
    refreshDbState();
  };

  const handleNavigateToTopology = (siteId: string) => {
    setTopologySiteFilter(siteId);
    setActiveTab('topology');
  };

  const handleNavigateToMap = (site: Site) => {
    setActiveTab('map');
  };

  const handleSaveSettings = (newSettings: SystemSettings) => {
    DatabaseService.saveSettings(newSettings);
    refreshDbState();
  };

  const handleAcknowledgePredictiveAlarm = (alarmId: string) => {
    setAlarmOverrides((prev) => ({
      ...prev,
      [alarmId]: { status: 'acknowledged' },
    }));
  };

  const handleResolvePredictiveAlarm = (alarmId: string) => {
    setAlarmOverrides((prev) => ({
      ...prev,
      [alarmId]: { status: 'mitigated' },
    }));
  };

  const handleResetDatabase = () => {
    if (confirm('Deseja resetar o banco de dados para os dados padrões de demonstração?')) {
      const reset = DatabaseService.resetToDefaults();
      setDbState({ ...reset });
      setAlarmOverrides({});
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  const unacknowledgedCount = dbState.changeEvents.filter((e) => !e.acknowledged).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== 'topology') setTopologySiteFilter(undefined);
          setActiveTab(tab);
        }}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenCsvImporter={() => setIsCsvModalOpen(true)}
        siteCount={dbState.sites.length}
        assetCount={dbState.assets.length}
        unacknowledgedEventsCount={unacknowledgedCount}
        criticalPredictiveCount={criticalPredictiveCount}
        onResetDatabase={handleResetDatabase}
      />

      {/* Main Tab Content */}
      <main className="flex-1 w-full h-[calc(100vh-56px)] overflow-hidden relative">
        {activeTab === 'map' && (
          <GoogleMapsView
            sites={dbState.sites}
            assets={dbState.assets}
            links={dbState.links}
            settings={dbState.settings}
            onOpenSiteManager={handleOpenSiteModal}
            onOpenTopologyForSite={handleNavigateToTopology}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'topology' && (
          <NetworkTopologyGraph
            assets={dbState.assets}
            links={dbState.links}
            sites={dbState.sites}
            snapshots={dbState.snapshots}
            selectedSiteId={topologySiteFilter}
          />
        )}

        {activeTab === 'sites' && (
          <SitesView
            sites={dbState.sites}
            assets={dbState.assets}
            onOpenSiteModal={handleOpenSiteModal}
            onDeleteSite={handleDeleteSite}
            onNavigateToMap={handleNavigateToMap}
            onNavigateToTopology={handleNavigateToTopology}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'correlation' && (
          <HistoricalCorrelationView
            alarms={dbState.historicalAlarms}
            incidents={dbState.incidents}
            settings={dbState.settings}
            onRefreshData={refreshDbState}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'predictive' && (
          <PredictiveAlarmsView
            predictiveAlarms={predictiveAlarms}
            sites={dbState.sites}
            weatherMap={weatherMap}
            settings={dbState.settings}
            onRefreshData={refreshDbState}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'inventory' && (
          <AssetInventoryView
            assets={dbState.assets}
            sites={dbState.sites}
            onSaveAsset={handleSaveAsset}
            onDeleteAsset={handleDeleteAsset}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsCustomizationView
            settings={dbState.settings}
            onSaveSettings={handleSaveSettings}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'discovery' && (
          <DiscoverySimulatorView
            collectionRuns={dbState.collectionRuns}
            reviewQueue={dbState.identityReviewQueue}
            onRefreshData={refreshDbState}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'audit' && (
          <AuditFeedView
            changeEvents={dbState.changeEvents}
            onRefreshData={refreshDbState}
            canEdit={canEdit}
          />
        )}
      </main>

      {/* Modals */}
      <SiteManagerModal
        isOpen={isSiteModalOpen}
        onClose={() => setIsSiteModalOpen(false)}
        onSaveSite={handleSaveSite}
        initialSite={editingSite}
      />

      <CsvImporterModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportComplete={handleCsvImportComplete}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          refreshDbState();
        }}
      />
    </div>
  );
}
