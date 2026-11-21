import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  Download,
  FolderTree,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Terminal,
  Trash2,
  XCircle,
  Bug,
  Code2,
  Globe,
  Languages,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCMS } from '../App';
import { getFallbackConsoleEvents, reportConsoleEvent } from '../services/consoleLogger';
import {
  DEFAULT_I18N_CONFIG,
  I18nConfig,
  detectVisitorLocationAndLocale,
  saveLocalI18nConfig,
} from '../services/i18nService';

const JAVA_API_BASE = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');

interface ConsoleEvent {
  id: string;
  level: string;
  source: string;
  category?: string;
  message: string;
  stackTrace?: string;
  path?: string;
  method?: string;
  httpStatus?: number;
  durationMs?: number;
  actor?: string;
  nodePath?: string;
  metadataJson?: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
}

const ConsolePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, pages, templates, media, collections, entries, rewrites, siteConfig, theme } = useCMS();

  const [activeTab, setActiveTab] = useState<'issues' | 'replication' | 'i18n' | 'repository' | 'health' | 'sdk'>('issues');
  const [overview, setOverview] = useState<any>(null);
  const [nodeHealth, setNodeHealth] = useState<any>(null);
  const [events, setEvents] = useState<ConsoleEvent[]>([]);
  const [repoData, setRepoData] = useState<any>(null);
  const [replication, setReplication] = useState<any>(null);
  const [i18nConfig, setI18nConfig] = useState<I18nConfig>(DEFAULT_I18N_CONFIG);
  const [savingI18n, setSavingI18n] = useState(false);
  const [simCountry, setSimCountry] = useState('IN');
  const [simResult, setSimResult] = useState<{ locale: string; country: string; reason: string } | null>(null);
  const [webhookConfig, setWebhookConfig] = useState<{ enabled: boolean; webhookUrl: string; secretToken: string }>({
    enabled: false,
    webhookUrl: '',
    secretToken: '',
  });
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [replicating, setReplicating] = useState(false);
  const [cleaningCache, setCleaningCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runningDiag, setRunningDiag] = useState(false);

  const [levelFilter, setLevelFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<ConsoleEvent | null>(null);
  const [selectedRepoNode, setSelectedRepoNode] = useState<{ path: string; data: any } | null>(null);

  const isAdmin = user?.role === 'Administrator' || user?.permissions?.settings === 'manage';

  const fetchConsoleData = async () => {
    setLoading(true);
    try {
      const [overviewRes, eventsRes, repoRes, replicationRes, webhookRes, i18nRes, nodeRes] = await Promise.all([
        JAVA_API_BASE ? fetch(`${JAVA_API_BASE}/api/v1/console/overview`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
        JAVA_API_BASE ? fetch(`${JAVA_API_BASE}/api/v1/console/events`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
        JAVA_API_BASE ? fetch(`${JAVA_API_BASE}/api/v1/console/repository`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
        JAVA_API_BASE ? fetch(`${JAVA_API_BASE}/api/v1/console/replication`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
        JAVA_API_BASE ? fetch(`${JAVA_API_BASE}/api/v1/console/replication/webhook`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
        JAVA_API_BASE ? fetch(`${JAVA_API_BASE}/api/v1/console/i18n`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
        fetch('/cms/api/health').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (overviewRes?.data) setOverview(overviewRes.data);
      const backendEvents: ConsoleEvent[] = Array.isArray(eventsRes?.data) ? eventsRes.data : [];
      const fallbackEvents = getFallbackConsoleEvents();
      setEvents([...backendEvents, ...fallbackEvents]);
      if (repoRes?.data) setRepoData(repoRes.data);
      if (replicationRes?.data) setReplication(replicationRes.data);
      if (webhookRes?.data) {
        setWebhookConfig({
          enabled: Boolean(webhookRes.data.enabled),
          webhookUrl: webhookRes.data.webhookUrl || '',
          secretToken: webhookRes.data.secretToken || '',
        });
      }
      if (i18nRes?.data) {
        setI18nConfig(i18nRes.data);
        saveLocalI18nConfig(i18nRes.data);
      }
      if (nodeRes) setNodeHealth(nodeRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchConsoleData();
    }
  }, [isAdmin]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (levelFilter !== 'ALL' && e.level?.toUpperCase() !== levelFilter) return false;
      if (sourceFilter !== 'ALL' && e.source?.toUpperCase() !== sourceFilter) return false;
      if (statusFilter !== 'ALL' && e.status?.toUpperCase() !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          e.message?.toLowerCase().includes(q) ||
          e.path?.toLowerCase().includes(q) ||
          e.nodePath?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.actor?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [events, levelFilter, sourceFilter, statusFilter, searchQuery]);

  const openIssueCount = useMemo(
    () => events.filter((e) => e.status === 'OPEN').length,
    [events]
  );

  const handleUpdateEventStatus = async (id: string, status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED') => {
    if (id.startsWith('local_') || !JAVA_API_BASE) {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      if (selectedEvent?.id === id) setSelectedEvent((prev) => (prev ? { ...prev, status } : null));
      toast.success(`Marked issue as ${status}`);
      return;
    }

    try {
      const res = await fetch(`${JAVA_API_BASE}/api/v1/console/events/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const json = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === id ? json.data : e)));
        if (selectedEvent?.id === id) setSelectedEvent(json.data);
        toast.success(`Issue marked as ${status}`);
      }
    } catch {
      toast.error('Failed to update issue status');
    }
  };

  const handlePurgeResolved = async () => {
    if (!JAVA_API_BASE) return;
    try {
      const res = await fetch(`${JAVA_API_BASE}/api/v1/console/events/resolved`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Cleared resolved console events');
        fetchConsoleData();
      }
    } catch {
      toast.error('Failed to purge resolved events');
    }
  };

  const clearBrowserCaches = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {
      // ignore browser CacheStorage restrictions
    }
  };

  const handleReplicateLive = async () => {
    setReplicating(true);
    try {
      if (JAVA_API_BASE) {
        const res = await fetch(`${JAVA_API_BASE}/api/v1/console/replication/replicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetDomain: siteConfig?.baseUrl || 'all-connected-domains',
            contentType: 'ALL',
            contentPath: '/content/*',
            actor: user?.email || user?.name || 'Administrator',
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.cacheCleared) {
            await clearBrowserCaches();
          }
          toast.success('Content replicated to live website & cache updated');
          await fetchConsoleData();
          return;
        }
      }
      toast.error('Replication failed: Java backend unreachable');
    } finally {
      setReplicating(false);
    }
  };

  const handleCleanCache = async () => {
    setCleaningCache(true);
    try {
      await clearBrowserCaches();
      if (JAVA_API_BASE) {
        const res = await fetch(`${JAVA_API_BASE}/api/v1/console/cache/clean`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actor: user?.email || user?.name || 'Administrator' }),
        });
        if (res.ok) {
          const json = await res.json();
          toast.success(`Cache cleaned (epoch v${json?.data?.cacheEpoch || ''})`);
          await fetchConsoleData();
          return;
        }
      }
      toast.success('Browser cache cleared');
    } finally {
      setCleaningCache(false);
    }
  };

  const handleToggleAutoCacheClean = async (enabled: boolean) => {
    if (!JAVA_API_BASE) return;
    try {
      const res = await fetch(`${JAVA_API_BASE}/api/v1/console/cache/auto-clean`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          actor: user?.email || user?.name || 'Administrator',
        }),
      });
      if (res.ok) {
        setReplication((prev: any) => (prev ? { ...prev, autoCacheClean: enabled } : prev));
        toast.success(`Auto Cache Clean ${enabled ? 'enabled' : 'disabled'}`);
        fetchConsoleData();
      }
    } catch {
      toast.error('Failed to update Auto Cache Clean setting');
    }
  };

  const handleSaveI18nConfig = async (nextConfig: I18nConfig) => {
    setI18nConfig(nextConfig);
    saveLocalI18nConfig(nextConfig);
    setSavingI18n(true);
    try {
      if (JAVA_API_BASE) {
        const res = await fetch(`${JAVA_API_BASE}/api/v1/console/i18n`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...nextConfig,
            actor: user?.email || user?.name || 'Administrator',
          }),
        });
        if (res.ok) {
          toast.success(
            `Multi-Language Websites ${nextConfig.multiLanguageEnabled ? 'enabled' : 'disabled'}`
          );
          fetchConsoleData();
          return;
        }
      }
      toast.success('Multi-language settings saved locally');
    } finally {
      setSavingI18n(false);
    }
  };

  const handleSimulateLocation = async (countryCode: string) => {
    setSimCountry(countryCode);
    const result = await detectVisitorLocationAndLocale(i18nConfig, countryCode);
    setSimResult(result);
  };

  const handleSaveWebhook = async () => {
    if (!JAVA_API_BASE) return;
    setSavingWebhook(true);
    try {
      const res = await fetch(`${JAVA_API_BASE}/api/v1/console/replication/webhook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...webhookConfig,
          actor: user?.email || user?.name || 'Administrator',
        }),
      });
      if (res.ok) {
        toast.success('Remote hosting webhook saved');
        fetchConsoleData();
      }
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!JAVA_API_BASE) return;
    setTestingWebhook(true);
    try {
      const res = await fetch(`${JAVA_API_BASE}/api/v1/console/replication/webhook/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: user?.email || user?.name || 'Administrator' }),
      });
      const json = await res.json().catch(() => null);
      toast.info(json?.message || 'Webhook test completed');
      fetchConsoleData();
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setRunningDiag(true);
    try {
      if (JAVA_API_BASE) {
        const res = await fetch(`${JAVA_API_BASE}/api/v1/console/diagnostics/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actor: user?.email || user?.name || 'Administrator' }),
        });
        if (res.ok) {
          toast.success('System & repository diagnostics passed');
          await fetchConsoleData();
          return;
        }
      }
      toast.error('Java backend diagnostics endpoint unreachable');
    } finally {
      setRunningDiag(false);
    }
  };

  const handleSimulateIssue = async () => {
    await reportConsoleEvent({
      level: 'ERROR',
      source: 'SDK',
      category: 'DIAGNOSTIC_TEST',
      message: 'Simulated application issue captured by DevInquire Admin Console',
      stackTrace: 'Error: Simulated diagnostic exception\n  at ConsolePage.handleSimulateIssue (/cms/console)\n  at DevInquireCmsClient.verifyPipeline (DevInquireCmsClient.java:103)',
      path: '/cms/console',
      method: 'POST',
      httpStatus: 500,
      actor: user?.email || 'admin@devinquire.com',
      nodePath: '/system/console/test-issue',
      metadata: { environment: 'local', sdk: 'devinquire-cms-sdk:1.0.0' },
    });
    toast.info('Test issue logged to persistent console store');
    fetchConsoleData();
  };

  const handleExportBundle = () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      exportedBy: user?.email || 'admin',
      overview,
      nodeHealth,
      events,
      repository: repoData,
      clientStateSummary: {
        pages: pages.length,
        templates: templates.length,
        media: media.length,
        collections: collections.length,
        entries: entries.length,
        rewrites: rewrites.length,
        siteConfig,
      },
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devinquire-console-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Diagnostic bundle exported');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#1C1C1E] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center mx-auto mb-5">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2">
            Administrator Access Required
          </h1>
          <p className="text-sm text-[#86868B] dark:text-[#98989D] mb-6">
            The System Console (`/console`) is restricted to Administrator users for inspecting repository nodes, SDK telemetry, and application errors.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl bg-[#4e45e1] dark:bg-[#6B63F2] text-white font-semibold text-sm hover:opacity-90 transition cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const jvm = overview?.jvm;
  const repoStats = overview?.repository;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-[#F5F5F7] dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7]`}>
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2] flex items-center justify-center">
              <Terminal size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">DevInquire System Console</h1>
              </div>
              <p className="text-xs text-[#86868B] dark:text-[#98989D]">
                Persistent issue diagnostics, JCR-style repository inspector &amp; Java SDK telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSimulateIssue}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FF9500]/12 text-[#FF9500] hover:bg-[#FF9500]/20 transition cursor-pointer"
            >
              <Bug size={14} />
              Test Issue Capture
            </button>
            <button
              onClick={handleRunDiagnostics}
              disabled={runningDiag}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#4e45e1] dark:bg-[#6B63F2] text-white hover:opacity-90 transition cursor-pointer disabled:opacity-60"
            >
              <Activity size={14} className={runningDiag ? 'animate-spin' : ''} />
              {runningDiag ? 'Running...' : 'Run Diagnostics'}
            </button>
            <button
              onClick={handleExportBundle}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              <Download size={14} />
              Export Bundle
            </button>
            <button
              onClick={fetchConsoleData}
              className="p-2 rounded-xl bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#2C2C2E] rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Java Backend</span>
              <Server size={16} className={overview ? 'text-[#34C759]' : 'text-[#FF3B30]'} />
            </div>
            <div className="text-2xl font-bold">{overview ? 'HEALTHY' : 'OFFLINE'}</div>
            <p className="text-xs text-[#86868B] mt-1">
              {jvm ? `Java ${jvm.javaVersion} · Uptime ${jvm.uptimeSeconds}s` : 'Check port 8080'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Open Issues</span>
              <AlertTriangle size={16} className={openIssueCount > 0 ? 'text-[#FF9500]' : 'text-[#34C759]'} />
            </div>
            <div className="text-2xl font-bold">{openIssueCount}</div>
            <p className="text-xs text-[#86868B] mt-1">
              {events.length} total persisted events
            </p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">JVM Heap</span>
              <Cpu size={16} className="text-[#4e45e1] dark:text-[#6B63F2]" />
            </div>
            <div className="text-2xl font-bold">
              {jvm ? `${jvm.usedMemoryMb} MB` : '—'}
            </div>
            <p className="text-xs text-[#86868B] mt-1">
              {jvm ? `of ${jvm.maxMemoryMb} MB max · ${jvm.activeThreads} threads` : 'Awaiting metrics'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#2C2C2E] rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Repository Nodes</span>
              <Database size={16} className="text-[#4e45e1] dark:text-[#6B63F2]" />
            </div>
            <div className="text-2xl font-bold">
              {repoStats ? repoStats.pages + repoStats.collections + repoStats.entries + repoStats.domains : pages.length}
            </div>
            <p className="text-xs text-[#86868B] mt-1">
              {repoStats ? `${repoStats.pages} pages · ${repoStats.collections} collections · ${repoStats.domains} domains` : 'Local state'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-black/[0.06] dark:border-white/[0.08] pb-3 overflow-x-auto">
          {[
            { id: 'issues', label: 'Issue & Exception Log', icon: AlertTriangle },
            { id: 'replication', label: 'Replication & Auto Cache', icon: Globe },
            { id: 'i18n', label: 'Multi-Language & Geo', icon: Languages },
            { id: 'repository', label: 'Repository Explorer (JCR)', icon: FolderTree },
            { id: 'health', label: 'System & SDK Health', icon: Activity },
            { id: 'sdk', label: 'SDK Telemetry & Integration', icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#4e45e1] dark:bg-[#6B63F2] text-white shadow-sm'
                    : 'bg-white dark:bg-[#2C2C2E] text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Issue & Exception Log */}
        {activeTab === 'issues' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className={`${selectedEvent ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-5`}>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search errors, paths, /content/... nodes..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-transparent focus:border-[#4e45e1] outline-none"
                  />
                </div>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] font-medium outline-none"
                >
                  <option value="ALL">All Levels</option>
                  <option value="ERROR">ERROR</option>
                  <option value="WARN">WARN</option>
                  <option value="INFO">INFO</option>
                </select>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] font-medium outline-none"
                >
                  <option value="ALL">All Sources</option>
                  <option value="BACKEND">BACKEND</option>
                  <option value="FRONTEND">FRONTEND</option>
                  <option value="SDK">SDK</option>
                  <option value="API">API</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] font-medium outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
                <button
                  onClick={handlePurgeResolved}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] hover:text-[#FF3B30] transition cursor-pointer"
                >
                  <Trash2 size={13} />
                  Clear Resolved
                </button>
              </div>

              {/* Event List */}
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] max-h-[540px] overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <div className="py-16 text-center text-sm text-[#86868B]">
                    No console events match the current filters.
                  </div>
                ) : (
                  filteredEvents.map((evt) => {
                    const isSelected = selectedEvent?.id === evt.id;
                    return (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`p-3.5 rounded-xl cursor-pointer transition flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#4e45e1]/8 dark:bg-[#6B63F2]/15'
                            : 'hover:bg-[#F5F5F7]/70 dark:hover:bg-[#1C1C1E]/70'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                evt.level === 'ERROR'
                                  ? 'bg-[#FF3B30]/12 text-[#FF3B30]'
                                  : evt.level === 'WARN'
                                  ? 'bg-[#FF9500]/12 text-[#FF9500]'
                                  : 'bg-[#4e45e1]/12 text-[#4e45e1] dark:text-[#6B63F2]'
                              }`}
                            >
                              {evt.level}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/5 dark:bg-white/10">
                              {evt.source}
                            </span>
                            {evt.httpStatus && (
                              <span className="text-[11px] font-mono text-[#86868B]">HTTP {evt.httpStatus}</span>
                            )}
                            <span className="text-[11px] font-mono text-[#86868B] truncate">
                              {evt.nodePath || evt.path || '/'}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-2">
                            {evt.message}
                          </p>
                          <div className="text-[10px] text-[#86868B] mt-1">
                            {new Date(evt.createdAt).toLocaleString()} · Actor: {evt.actor || 'system'}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            evt.status === 'OPEN'
                              ? 'bg-[#FF3B30]/12 text-[#FF3B30]'
                              : evt.status === 'ACKNOWLEDGED'
                              ? 'bg-[#FF9500]/12 text-[#FF9500]'
                              : 'bg-[#34C759]/12 text-[#34C759]'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {selectedEvent && (
              <div className="lg:col-span-5 bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold">Event Inspector</h3>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-xs text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-3 text-xs flex-1 overflow-y-auto">
                  <div>
                    <span className="text-[#86868B] block mb-0.5">Message</span>
                    <div className="p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] font-medium">
                      {selectedEvent.message}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E]">
                      <span className="text-[#86868B] block text-[10px]">JCR Node Path</span>
                      <span className="font-mono">{selectedEvent.nodePath || '—'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E]">
                      <span className="text-[#86868B] block text-[10px]">Endpoint</span>
                      <span className="font-mono">{selectedEvent.method || ''} {selectedEvent.path || '—'}</span>
                    </div>
                  </div>

                  {selectedEvent.stackTrace && (
                    <div>
                      <span className="text-[#86868B] block mb-1">Stack Trace</span>
                      <pre className="p-3 rounded-xl bg-[#1C1C1E] text-[#F5F5F7] font-mono text-[11px] overflow-x-auto max-h-56 whitespace-pre-wrap">
                        {selectedEvent.stackTrace}
                      </pre>
                    </div>
                  )}

                  {selectedEvent.metadataJson && (
                    <div>
                      <span className="text-[#86868B] block mb-1">Metadata</span>
                      <pre className="p-3 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] font-mono text-[11px] overflow-x-auto">
                        {selectedEvent.metadataJson}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateEventStatus(selectedEvent.id, 'ACKNOWLEDGED')}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#FF9500]/12 text-[#FF9500] hover:bg-[#FF9500]/20 transition cursor-pointer"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => handleUpdateEventStatus(selectedEvent.id, 'RESOLVED')}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#34C759]/12 text-[#34C759] hover:bg-[#34C759]/20 transition cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 size={13} />
                    Resolve
                  </button>
                  <button
                    onClick={() => handleUpdateEventStatus(selectedEvent.id, 'OPEN')}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F5F5F7] dark:bg-[#1C1C1E] hover:opacity-80 transition cursor-pointer"
                  >
                    Reopen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Replication & Auto Cache */}
        {activeTab === 'replication' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      replication?.liveStatus === 'LIVE_UP_TO_DATE'
                        ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]'
                        : 'bg-[#FF9500]/12 text-[#FF9500]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        replication?.liveStatus === 'LIVE_UP_TO_DATE' ? 'bg-[#34C759]' : 'bg-[#FF9500] animate-pulse'
                      }`}
                    />
                    {replication?.liveStatus === 'LIVE_UP_TO_DATE'
                      ? 'Website Live & Up To Date'
                      : 'Pending Content Replication'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#4e45e1]/10 dark:bg-[#6B63F2]/15 text-[#4e45e1] dark:text-[#6B63F2]">
                    Cache Epoch v{replication?.cacheEpoch ?? 1}
                  </span>
                </div>
                <p className="text-xs text-[#86868B] dark:text-[#98989D]">
                  Target: <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">{siteConfig?.baseUrl || 'http://localhost:3002/cms/'}</strong>
                  {' · '}Published Pages: <strong>{replication?.publishedPages ?? pages.filter((p) => p.status === 'published').length}</strong>
                  {' · '}Last Cache Clean: <strong>{replication?.lastCacheCleanAt ? new Date(replication.lastCacheCleanAt).toLocaleString() : '—'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(replication?.autoCacheClean ?? true)}
                    onChange={(e) => handleToggleAutoCacheClean(e.target.checked)}
                    className="accent-[#4e45e1] w-4 h-4 cursor-pointer"
                  />
                  <span>Auto Cache Clean</span>
                </label>

                <button
                  onClick={handleCleanCache}
                  disabled={cleaningCache}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F5F5F7] dark:bg-[#1C1C1E] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-60"
                >
                  <Sparkles size={14} className={cleaningCache ? 'animate-spin' : ''} />
                  {cleaningCache ? 'Cleaning...' : 'Clean Cache Now'}
                </button>

                <button
                  onClick={handleReplicateLive}
                  disabled={replicating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#4e45e1] dark:bg-[#6B63F2] text-white hover:opacity-90 transition cursor-pointer disabled:opacity-60"
                >
                  <Zap size={14} className={replicating ? 'animate-pulse' : ''} />
                  {replicating ? 'Replicating...' : 'Replicate & Push Live'}
                </button>
              </div>
            </div>

            {/* Remote Hosting Server Webhook / Deploy Hook */}
            <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">Remote Hosting Server Webhook / Deploy Hook</h3>
                  <p className="text-xs text-[#86868B] dark:text-[#98989D]">
                    Automatically notifies your separate hosting server (or CDN purge / Netlify / Vercel build hook) whenever content is published or replicated.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webhookConfig.enabled}
                    onChange={(e) => setWebhookConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="accent-[#4e45e1] w-4 h-4 cursor-pointer"
                  />
                  <span>Enable Remote Webhook</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <input
                  value={webhookConfig.webhookUrl}
                  onChange={(e) => setWebhookConfig((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                  placeholder="https://your-hosting-server.com/api/cms-sync"
                  className="md:col-span-6 px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs font-mono outline-none border border-transparent focus:border-[#4e45e1]"
                />
                <input
                  type="password"
                  value={webhookConfig.secretToken}
                  onChange={(e) => setWebhookConfig((prev) => ({ ...prev, secretToken: e.target.value }))}
                  placeholder="Optional Bearer / Secret Token"
                  className="md:col-span-3 px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs font-mono outline-none border border-transparent focus:border-[#4e45e1]"
                />
                <div className="md:col-span-3 flex gap-2">
                  <button
                    onClick={handleSaveWebhook}
                    disabled={savingWebhook}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#4e45e1] dark:bg-[#6B63F2] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-60"
                  >
                    {savingWebhook ? 'Saving...' : 'Save Hook'}
                  </button>
                  <button
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !webhookConfig.webhookUrl}
                    className="py-2.5 px-3 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
                  >
                    {testingWebhook ? 'Testing...' : 'Test Ping'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-5">
              <h3 className="text-sm font-bold mb-4">Replication &amp; Cache Purge History</h3>
              {!replication?.history?.length ? (
                <div className="py-12 text-center text-sm text-[#86868B]">
                  No replication jobs recorded yet. Click <strong>Replicate &amp; Push Live</strong> to publish the latest content snapshot and purge cache.
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                  {replication.history.map((job: any) => (
                    <div key={job.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#34C759]/12 text-[#34C759]">
                            {job.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/5 dark:bg-white/10">
                            v{job.revision}
                          </span>
                          {job.cacheCleared && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#4e45e1]/12 text-[#4e45e1] dark:text-[#6B63F2]">
                              Cache Cleaned
                            </span>
                          )}
                          <span className="text-xs font-mono text-[#86868B]">{job.targetDomain}</span>
                        </div>
                        <p className="text-xs font-medium">{job.message}</p>
                        <div className="text-[10px] text-[#86868B] mt-0.5">
                          {new Date(job.createdAt).toLocaleString()} · {job.durationMs}ms · Actor: {job.actor}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Multi-Language & Geo */}
        {activeTab === 'i18n' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold">Location-Based Multi-Language Websites</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      i18nConfig.multiLanguageEnabled
                        ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]'
                        : 'bg-black/5 dark:bg-white/10 text-[#86868B]'
                    }`}
                  >
                    {i18nConfig.multiLanguageEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-[#86868B] dark:text-[#98989D]">
                  Automatically detects visitor location (geo headers, IP/country, and timezone) to serve the website in their local language.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={i18nConfig.multiLanguageEnabled}
                    disabled={savingI18n}
                    onChange={(e) =>
                      handleSaveI18nConfig({
                        ...i18nConfig,
                        multiLanguageEnabled: e.target.checked,
                      })
                    }
                    className="accent-[#4e45e1] w-4 h-4 cursor-pointer"
                  />
                  <span>Enable Multi-Language</span>
                </label>

                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={i18nConfig.autoDetectByLocation}
                    disabled={savingI18n}
                    onChange={(e) =>
                      handleSaveI18nConfig({
                        ...i18nConfig,
                        autoDetectByLocation: e.target.checked,
                      })
                    }
                    className="accent-[#4e45e1] w-4 h-4 cursor-pointer"
                  />
                  <span>Auto-Detect by Location</span>
                </label>

                <select
                  value={i18nConfig.defaultLocale}
                  disabled={savingI18n}
                  onChange={(e) =>
                    handleSaveI18nConfig({
                      ...i18nConfig,
                      defaultLocale: e.target.value,
                    })
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs font-semibold outline-none"
                >
                  {i18nConfig.supportedLocales.map((l) => (
                    <option key={l.code} value={l.code}>
                      Default: {l.name} ({l.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-5">
                <h4 className="text-sm font-bold mb-3">Supported Languages &amp; Country Routing</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {i18nConfig.supportedLocales.map((loc) => (
                    <div
                      key={loc.code}
                      className="p-3.5 rounded-2xl bg-[#F5F5F7] dark:bg-[#1C1C1E] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-2">
                          <span>{loc.nativeName}</span>
                          <span className="text-[#86868B] font-normal">({loc.name})</span>
                          {loc.rtl && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#4e45e1]/12 text-[#4e45e1] dark:text-[#6B63F2]">
                              RTL
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-[#86868B] mt-1">
                          Countries: {loc.countries.join(', ')}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={loc.enabled}
                        onChange={(e) => {
                          const updated = i18nConfig.supportedLocales.map((item) =>
                            item.code === loc.code ? { ...item, enabled: e.target.checked } : item
                          );
                          handleSaveI18nConfig({ ...i18nConfig, supportedLocales: updated });
                        }}
                        className="accent-[#4e45e1] w-4 h-4 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-5 space-y-4">
                <h4 className="text-sm font-bold">Test Location Auto-Detection</h4>
                <p className="text-xs text-[#86868B] dark:text-[#98989D]">
                  Simulate a visitor from any country to verify which language will be served automatically.
                </p>
                <div className="flex gap-2">
                  <select
                    value={simCountry}
                    onChange={(e) => setSimCountry(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs font-semibold outline-none"
                  >
                    <option value="IN">India (IN)</option>
                    <option value="US">United States (US)</option>
                    <option value="FR">France (FR)</option>
                    <option value="DE">Germany (DE)</option>
                    <option value="ES">Spain (ES)</option>
                    <option value="JP">Japan (JP)</option>
                    <option value="SA">Saudi Arabia (SA)</option>
                    <option value="BR">Brazil (BR)</option>
                  </select>
                  <button
                    onClick={() => handleSimulateLocation(simCountry)}
                    className="px-4 py-2 rounded-xl bg-[#4e45e1] dark:bg-[#6B63F2] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer"
                  >
                    Test
                  </button>
                </div>
                {simResult && (
                  <div className="p-3.5 rounded-2xl bg-[#F5F5F7] dark:bg-[#1C1C1E] text-xs space-y-1">
                    <div>
                      Resolved Language: <strong className="font-mono uppercase">{simResult.locale}</strong>
                    </div>
                    <div className="text-[#86868B]">Country: {simResult.country}</div>
                    <div className="text-[#86868B]">{simResult.reason}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Repository Explorer (JCR / CRXDE style) */}
        {activeTab === 'repository' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-5 max-h-[600px] overflow-y-auto space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FolderTree size={16} className="text-[#4e45e1] dark:text-[#6B63F2]" />
                /content &amp; /etc Repository Tree
              </h3>

              {[
                { label: '/content/pages', items: repoData?.nodes?.pages || pages.map((p) => ({ path: `/content/pages/${p.slug}`, ...p })) },
                { label: '/content/collections', items: repoData?.nodes?.collections || collections.map((c) => ({ path: `/content/collections/${c.slug}`, ...c })) },
                { label: '/etc/domains', items: repoData?.nodes?.domains || [] },
                { label: '/etc/siteConfig', items: [{ path: '/etc/siteConfig/default', primaryType: 'dq:SiteConfig', ...siteConfig }] },
              ].map((group) => (
                <div key={group.label}>
                  <div className="text-[11px] font-mono font-bold text-[#86868B] uppercase tracking-wider mb-1.5">
                    {group.label} ({group.items.length})
                  </div>
                  <div className="space-y-1">
                    {group.items.map((node: any, idx: number) => (
                      <button
                        key={node.path || idx}
                        onClick={() => setSelectedRepoNode({ path: node.path, data: node })}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                          selectedRepoNode?.path === node.path
                            ? 'bg-[#4e45e1]/12 text-[#4e45e1] dark:text-[#6B63F2] font-semibold'
                            : 'hover:bg-[#F5F5F7] dark:hover:bg-[#1C1C1E]'
                        }`}
                      >
                        <span className="truncate">{node.path}</span>
                        <ChevronRight size={13} className="shrink-0 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-5">
              <h3 className="text-sm font-bold mb-3">
                {selectedRepoNode ? `Node Properties: ${selectedRepoNode.path}` : 'Select a repository node to inspect'}
              </h3>
              <pre className="p-4 rounded-2xl bg-[#1C1C1E] text-[#F5F5F7] font-mono text-xs overflow-auto max-h-[520px]">
                {selectedRepoNode
                  ? JSON.stringify(selectedRepoNode.data, null, 2)
                  : '// Click any /content/... or /etc/... node on the left to inspect its stored JCR-style properties.'}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: System & SDK Health */}
        {activeTab === 'health' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-3">
              <h3 className="text-sm font-bold">Java Spring Boot Runtime (Port 8080)</h3>
              <pre className="p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#1C1C1E] font-mono text-xs overflow-auto">
                {JSON.stringify(overview || { status: 'unreachable' }, null, 2)}
              </pre>
            </div>
            <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-3">
              <h3 className="text-sm font-bold">Node / Vite Gateway (/cms/api/health)</h3>
              <pre className="p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#1C1C1E] font-mono text-xs overflow-auto">
                {JSON.stringify(nodeHealth || { status: 'checking' }, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 4: SDK Telemetry & Integration */}
        {activeTab === 'sdk' && (
          <div className="bg-white dark:bg-[#2C2C2E] rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] p-6 space-y-4">
            <h3 className="text-sm font-bold">DevInquire Java Delivery SDK (AEM / Bloomreach Pattern)</h3>
            <p className="text-xs text-[#86868B] dark:text-[#98989D]">
              Every API mutation, 4xx/5xx error, unhandled backend exception, and frontend runtime error is automatically persisted in <code className="font-mono">cms_console_events</code>.
            </p>
            <pre className="p-4 rounded-2xl bg-[#1C1C1E] text-[#F5F5F7] font-mono text-xs overflow-x-auto">
{`DevInquireCmsClient cms = DevInquireCmsClient.builder()
    .baseUrl("${JAVA_API_BASE || 'http://localhost:8080'}")
    .build();

// Fetch published page (AEM Sling Model / Bloomreach Delivery style)
Optional<CmsPage> page = cms.getPageBySlug("home");

// Query structured collection items
List<CmsCollectionEntry> posts = cms.getCollectionItems("blog");`}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
};

export default ConsolePage;
