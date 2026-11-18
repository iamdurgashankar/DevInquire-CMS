import React, { useState, useMemo, useEffect } from 'react';
import {
  History,
  RotateCcw,
  BookmarkPlus,
  Eye,
  GitCompare,
  Trash2,
  Clock,
  User,
  Layers,
  Check,
  X,
  FileText,
  Globe,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Page,
  PageVersion,
  PageVersionSnapshot,
  PageVersionTrigger,
  GlobalStyles,
} from '../types';
import { BlockRenderer } from './BlockRenderer';

const MAX_VERSIONS_PER_PAGE = 40;

export const extractPageSnapshot = (page: Page): PageVersionSnapshot => {
  return JSON.parse(
    JSON.stringify({
      title: page.title,
      slug: page.slug,
      status: page.status,
      seo: page.seo || { metaTitle: page.title, metaDescription: '' },
      layoutJSON: page.layoutJSON || { sections: [], layoutVersion: '1.0' },
      ...(page.isCustomSite !== undefined ? { isCustomSite: page.isCustomSite } : {}),
      ...(page.customSiteUrl !== undefined ? { customSiteUrl: page.customSiteUrl } : {}),
      ...(page.customHTML !== undefined ? { customHTML: page.customHTML } : {}),
      ...(page.customCSS !== undefined ? { customCSS: page.customCSS } : {}),
      ...(page.customJS !== undefined ? { customJS: page.customJS } : {}),
    })
  );
};

export const areSnapshotsEqual = (a: PageVersionSnapshot, b: PageVersionSnapshot): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

export const appendPageVersion = (
  page: Page,
  options: {
    label?: string;
    notes?: string;
    trigger: PageVersionTrigger;
    author?: string;
    skipIfUnchanged?: boolean;
  }
): { updatedPage: Page; createdVersion: PageVersion | null } => {
  const existingVersions = Array.isArray(page.versions) ? [...page.versions] : [];
  const currentSnapshot = extractPageSnapshot(page);

  if (options.skipIfUnchanged && existingVersions.length > 0) {
    const latestVersion = existingVersions[0];
    if (latestVersion && areSnapshotsEqual(latestVersion.snapshot, currentSnapshot)) {
      return { updatedPage: page, createdVersion: null };
    }
  }

  const maxVersionNum = existingVersions.reduce(
    (max, v) => Math.max(max, v.versionNumber || 0),
    0
  );
  const nextVersionNumber = maxVersionNum + 1;

  const defaultLabel =
    options.label?.trim() ||
    (options.trigger === 'manual'
      ? `Manual Snapshot v${nextVersionNumber}`
      : options.trigger === 'publish'
        ? `Published v${nextVersionNumber}`
        : options.trigger === 'restore-backup'
          ? `Backup before revert (v${nextVersionNumber})`
          : `Saved Checkpoint v${nextVersionNumber}`);

  const newVersion: PageVersion = {
    id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    pageId: page.id,
    versionNumber: nextVersionNumber,
    label: defaultLabel,
    ...(options.notes?.trim() ? { notes: options.notes.trim() } : {}),
    trigger: options.trigger,
    createdAt: new Date().toISOString(),
    author: options.author || page.author || 'Admin',
    snapshot: currentSnapshot,
  };

  const nextVersions = [newVersion, ...existingVersions].slice(0, MAX_VERSIONS_PER_PAGE);

  const updatedPage: Page = {
    ...page,
    updatedAt: new Date().toISOString(),
    versions: nextVersions,
  };

  return { updatedPage, createdVersion: newVersion };
};

export const ensurePageBaselineVersion = (page: Page): Page => {
  if (Array.isArray(page.versions) && page.versions.length > 0) {
    return page;
  }
  const initialSnapshot = extractPageSnapshot(page);
  const baselineVersion: PageVersion = {
    id: `ver_init_${page.id}`,
    pageId: page.id,
    versionNumber: 1,
    label: 'Initial Page Baseline (v1)',
    notes: 'Initial baseline snapshot captured automatically.',
    trigger: 'save',
    createdAt: page.createdAt || new Date().toISOString(),
    author: page.author || 'Admin',
    snapshot: initialSnapshot,
  };
  return {
    ...page,
    versions: [baselineVersion],
  };
};

export const revertPageToVersion = (
  page: Page,
  targetVersion: PageVersion,
  author?: string
): Page => {
  // First create a safety backup of the current state if it differs from the latest snapshot
  const { updatedPage: pageWithBackup } = appendPageVersion(page, {
    label: `Auto-backup before reverting to v${targetVersion.versionNumber}`,
    notes: `Captured automatically prior to restoring "${targetVersion.label}"`,
    trigger: 'restore-backup',
    author: author || page.author || 'Admin',
    skipIfUnchanged: true,
  });

  const snap: PageVersionSnapshot = JSON.parse(JSON.stringify(targetVersion.snapshot));

  const restoredPage: Page = {
    ...pageWithBackup,
    title: snap.title,
    slug: snap.slug,
    status: snap.status,
    seo: snap.seo,
    layoutJSON: snap.layoutJSON,
    isCustomSite: snap.isCustomSite,
    customSiteUrl: snap.customSiteUrl,
    customHTML: snap.customHTML,
    customCSS: snap.customCSS,
    customJS: snap.customJS,
    updatedAt: new Date().toISOString(),
  };

  return restoredPage;
};

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: Page;
  globalStyles: GlobalStyles;
  currentUser?: string;
  canEdit?: boolean;
  onUpdatePage: (updatedPage: Page, actionMessage?: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  page,
  globalStyles,
  currentUser = 'Admin',
  canEdit = true,
  onUpdatePage,
}) => {
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [triggerFilter, setTriggerFilter] = useState<'all' | 'manual' | 'save' | 'restore-backup'>('all');
  const [inspectorTab, setInspectorTab] = useState<'preview' | 'diff'>('preview');
  const [confirmRevertVersionId, setConfirmRevertVersionId] = useState<string | null>(null);

  const versions = useMemo(() => {
    const list = Array.isArray(page.versions) ? [...page.versions] : [];
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [page.versions]);

  const filteredVersions = useMemo(() => {
    if (triggerFilter === 'all') return versions;
    if (triggerFilter === 'save') {
      return versions.filter(v => v.trigger === 'save' || v.trigger === 'publish');
    }
    return versions.filter(v => v.trigger === triggerFilter);
  }, [versions, triggerFilter]);

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    versions[0]?.id || null
  );

  useEffect(() => {
    if (isOpen) {
      if (versions.length > 0 && (!selectedVersionId || !versions.some(v => v.id === selectedVersionId))) {
        setSelectedVersionId(versions[0].id);
      } else if (versions.length === 0) {
        setSelectedVersionId(null);
      }
      setConfirmRevertVersionId(null);
    }
  }, [isOpen, versions, selectedVersionId]);

  if (!isOpen) return null;

  const selectedVersion = versions.find(v => v.id === selectedVersionId) || versions[0] || null;
  const currentSnapshot = extractPageSnapshot(page);

  const countBlocksInLayout = (layout?: Page['layoutJSON']) => {
    if (!layout?.sections) return 0;
    return layout.sections.reduce(
      (acc, sec) =>
        acc + (sec.columns || []).reduce((cAcc, col) => cAcc + (col.blocks || []).length, 0),
      0
    );
  };

  const handleCreateManualSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('You need edit permissions to save snapshots.');
      return;
    }

    const { updatedPage, createdVersion } = appendPageVersion(page, {
      label: snapshotLabel.trim() || undefined,
      notes: snapshotNotes.trim() || undefined,
      trigger: 'manual',
      author: currentUser,
      skipIfUnchanged: false,
    });

    onUpdatePage(
      updatedPage,
      `Saved snapshot "${createdVersion?.label || 'New Snapshot'}"`
    );
    if (createdVersion) {
      setSelectedVersionId(createdVersion.id);
    }
    setSnapshotLabel('');
    setSnapshotNotes('');
    setShowCreateForm(false);
    toast.success(`Snapshot "${createdVersion?.label}" saved to version history`);
  };

  const handleRevert = (targetVersion: PageVersion) => {
    if (!canEdit) {
      toast.error('You need edit permissions to revert page versions.');
      return;
    }

    const restoredPage = revertPageToVersion(page, targetVersion, currentUser);
    onUpdatePage(
      restoredPage,
      `Reverted "${page.title}" to v${targetVersion.versionNumber} (${targetVersion.label})`
    );
    setConfirmRevertVersionId(null);
    toast.success(
      `Reverted page to v${targetVersion.versionNumber}: "${targetVersion.label}"`
    );
  };

  const handleDeleteVersion = (versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    const target = versions.find(v => v.id === versionId);
    const nextVersions = versions.filter(v => v.id !== versionId);
    const updatedPage: Page = {
      ...page,
      versions: nextVersions,
    };
    onUpdatePage(updatedPage);
    if (selectedVersionId === versionId) {
      setSelectedVersionId(nextVersions[0]?.id || null);
    }
    toast.success(`Deleted version ${target ? `v${target.versionNumber}` : ''}`);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getTriggerBadge = (trigger: PageVersionTrigger) => {
    switch (trigger) {
      case 'manual':
        return {
          label: 'Manual Snapshot',
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'publish':
        return {
          label: 'Published',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'restore-backup':
        return {
          label: 'Pre-Revert Backup',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'save':
      default:
        return {
          label: 'Saved Checkpoint',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
    }
  };

  const isSelectedIdenticalToCurrent =
    selectedVersion ? areSnapshotsEqual(selectedVersion.snapshot, currentSnapshot) : false;

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl h-[86vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <History size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  Version History &amp; Snapshots
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-xs font-mono font-semibold">
                  {versions.length} {versions.length === 1 ? 'version' : 'versions'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Page: <strong className="text-slate-700">{page.title}</strong>{' '}
                <span className="font-mono text-slate-400">(/{page.slug})</span> — Save named checkpoints or revert to any prior state
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowCreateForm(prev => !prev)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <BookmarkPlus size={15} />
                <span>Save Current Snapshot</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Close Version History"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Split Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Snapshot Creator + Version Timeline */}
          <div className="w-96 border-r border-slate-200 flex flex-col bg-slate-50/40 shrink-0">
            {/* Collapsible Save Snapshot Form */}
            {showCreateForm && canEdit && (
              <form
                onSubmit={handleCreateManualSnapshot}
                className="p-4 border-b border-slate-200 bg-blue-50/50 space-y-3 animate-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-blue-600" />
                    Create Named Snapshot
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Snapshot Label
                  </label>
                  <input
                    type="text"
                    value={snapshotLabel}
                    onChange={e => setSnapshotLabel(e.target.value)}
                    placeholder="e.g., Before Q4 Hero Redesign"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Change Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={snapshotNotes}
                    onChange={e => setSnapshotNotes(e.target.value)}
                    placeholder="What changed in this version?"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Save Snapshot Now</span>
                </button>
              </form>
            )}

            {/* Filter Bar */}
            <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'manual', label: 'Manual' },
                  { id: 'save', label: 'Saved/Pub' },
                  { id: 'restore-backup', label: 'Backups' },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTriggerFilter(tab.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    triggerFilter === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Version List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Current Live State Card */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white/80">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Current Working State
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {page.layoutJSON?.sections?.length || 0} sec •{' '}
                    {countBlocksInLayout(page.layoutJSON)} blk
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate">{page.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Last updated {formatTimestamp(page.updatedAt)} by {page.author}
                </p>
              </div>

              {filteredVersions.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <History size={22} />
                  </div>
                  <p className="text-xs font-bold text-slate-700 mb-1">
                    {versions.length === 0
                      ? 'No saved versions yet'
                      : 'No versions match this filter'}
                  </p>
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    {versions.length === 0
                      ? 'Save a snapshot now or publish changes in the editor to start tracking version history for this page.'
                      : 'Switch to "All" to view all recorded snapshots.'}
                  </p>
                  {versions.length === 0 && canEdit && (
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(true)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <BookmarkPlus size={14} />
                      <span>Create First Snapshot</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredVersions.map(ver => {
                  const isSelected = selectedVersion?.id === ver.id;
                  const badge = getTriggerBadge(ver.trigger);
                  const secCount = ver.snapshot.layoutJSON?.sections?.length || 0;
                  const blkCount = countBlocksInLayout(ver.snapshot.layoutJSON);
                  const isCurrentMatch = areSnapshotsEqual(ver.snapshot, currentSnapshot);

                  return (
                    <div
                      key={ver.id}
                      onClick={() => {
                        setSelectedVersionId(ver.id);
                        setConfirmRevertVersionId(null);
                      }}
                      className={`group rounded-xl border p-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/15 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono font-bold">
                            v{ver.versionNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {isCurrentMatch && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                              Matches Current
                            </span>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={e => handleDeleteVersion(ver.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="Delete snapshot"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {ver.label}
                      </h4>

                      {ver.notes && (
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          {ver.notes}
                        </p>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 truncate">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          {formatTimestamp(ver.createdAt)}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {secCount} sec • {blkCount} blk
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {ver.author}
                        </span>
                        <span className="uppercase font-semibold">
                          {ver.snapshot.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Snapshot Inspector, Visual Preview & Revert Controls */}
          <div className="flex-1 flex flex-col bg-slate-100/70 overflow-hidden">
            {!selectedVersion ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-xs">
                  <History size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  No Version Selected
                </h3>
                <p className="text-xs text-slate-500 max-w-md mb-6">
                  Create your first page snapshot using the button above to capture the layout, content blocks, and SEO settings of <strong>{page.title}</strong>.
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <BookmarkPlus size={15} />
                    <span>Save Initial Snapshot</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Selected Version Action Subheader */}
                <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-mono font-bold">
                        v{selectedVersion.versionNumber}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {selectedVersion.label}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                          getTriggerBadge(selectedVersion.trigger).className
                        }`}
                      >
                        {getTriggerBadge(selectedVersion.trigger).label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Captured on {new Date(selectedVersion.createdAt).toLocaleString()} by{' '}
                      <strong className="text-slate-700">{selectedVersion.author}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* View Switcher: Visual Preview vs Comparison */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setInspectorTab('preview')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          inspectorTab === 'preview'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Eye size={13} />
                        <span>Visual Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('diff')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          inspectorTab === 'diff'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <GitCompare size={13} />
                        <span>Compare with Current</span>
                      </button>
                    </div>

                    {/* Revert Button / Confirmation */}
                    {canEdit && (
                      <>
                        {confirmRevertVersionId === selectedVersion.id ? (
                          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                            <span className="text-[11px] font-bold text-amber-900">
                              Revert to v{selectedVersion.versionNumber}?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRevert(selectedVersion)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                            >
                              Confirm Revert
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRevertVersionId(null)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-amber-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRevertVersionId(selectedVersion.id)}
                            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <RotateCcw size={14} />
                            <span>Revert to v{selectedVersion.versionNumber}</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Safety Notice Bar */}
                <div className="px-6 py-2 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-800">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                    Reverting automatically saves a backup snapshot of your current page state first so no work is ever lost.
                  </span>
                  {isSelectedIdenticalToCurrent && (
                    <span className="font-semibold text-emerald-700">
                      This snapshot matches your current live page
                    </span>
                  )}
                </div>

                {/* Inspector Body */}
                <div className="flex-1 overflow-y-auto p-6">
                  {inspectorTab === 'preview' ? (
                    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      {/* Simulated Browser Bar for Snapshot */}
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Globe size={13} className="text-slate-400" />
                          <span className="font-semibold text-slate-700">
                            {selectedVersion.snapshot.title}
                          </span>
                          <span className="font-mono text-slate-400">
                            /{selectedVersion.snapshot.slug}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            selectedVersion.snapshot.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {selectedVersion.snapshot.status}
                        </span>
                      </div>

                      {/* Rendered Snapshot Content */}
                      {selectedVersion.snapshot.isCustomSite ? (
                        <div className="p-6 space-y-3">
                          <div className="text-xs font-bold text-slate-600">
                            Custom Code Page Snapshot
                          </div>
                          <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto max-h-96">
                            {selectedVersion.snapshot.customHTML || '<!-- Empty Custom HTML -->'}
                          </pre>
                        </div>
                      ) : (selectedVersion.snapshot.layoutJSON?.sections?.length || 0) === 0 ? (
                        <div className="p-16 text-center text-slate-400 text-xs">
                          This snapshot has an empty page canvas (0 sections).
                        </div>
                      ) : (
                        <div>
                          {selectedVersion.snapshot.layoutJSON.sections.map(sec => (
                            <section
                              key={sec.id}
                              style={{
                                backgroundColor: sec.styles?.backgroundColor || 'transparent',
                                backgroundImage: sec.styles?.backgroundGradient
                                  ? sec.styles.backgroundGradient
                                  : sec.styles?.backgroundImage
                                    ? `url(${sec.styles.backgroundImage})`
                                    : undefined,
                                backgroundSize: sec.styles?.backgroundSize || 'cover',
                                backgroundPosition:
                                  sec.styles?.backgroundPosition || 'center',
                                padding: sec.styles?.padding || '3rem 0',
                              }}
                              className="px-6 border-b border-slate-100 last:border-b-0"
                            >
                              <div
                                className="mx-auto flex flex-wrap md:flex-nowrap gap-6"
                                style={{
                                  maxWidth: globalStyles.containerWidth || '1200px',
                                }}
                              >
                                {(sec.columns || []).map(col => (
                                  <div
                                    key={col.id}
                                    style={{ width: `${col.width || 100}%` }}
                                    className="w-full md:w-auto flex-1 space-y-4"
                                  >
                                    {(col.blocks || []).map(blk => (
                                      <BlockRenderer
                                        key={blk.id}
                                        block={blk}
                                        globalStyles={globalStyles}
                                        isEditing={false}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Diff / Comparison View */
                    <div className="max-w-4xl mx-auto space-y-6">
                      {/* Metadata & Summary Comparison */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                          Snapshot v{selectedVersion.versionNumber} vs. Current Working Page
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-blue-900">
                                Selected Snapshot (v{selectedVersion.versionNumber})
                              </span>
                              <span className="text-[11px] font-mono text-blue-700">
                                {formatTimestamp(selectedVersion.createdAt)}
                              </span>
                            </div>
                            <div className="text-xs space-y-1 text-slate-700">
                              <div>
                                <span className="text-slate-400">Title:</span>{' '}
                                <strong>{selectedVersion.snapshot.title}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400">Slug:</span>{' '}
                                <code className="font-mono">/{selectedVersion.snapshot.slug}</code>
                              </div>
                              <div>
                                <span className="text-slate-400">Status:</span>{' '}
                                <span className="uppercase font-semibold">
                                  {selectedVersion.snapshot.status}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Structure:</span>{' '}
                                <strong>
                                  {selectedVersion.snapshot.layoutJSON?.sections?.length || 0}{' '}
                                  sections, {countBlocksInLayout(selectedVersion.snapshot.layoutJSON)}{' '}
                                  blocks
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-400">Meta Title:</span>{' '}
                                {selectedVersion.snapshot.seo?.metaTitle || '—'}
                              </div>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">
                                Current Working State
                              </span>
                              <span className="text-[11px] font-mono text-emerald-700">
                                Active Now
                              </span>
                            </div>
                            <div className="text-xs space-y-1 text-slate-700">
                              <div>
                                <span className="text-slate-400">Title:</span>{' '}
                                <strong>{page.title}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400">Slug:</span>{' '}
                                <code className="font-mono">/{page.slug}</code>
                              </div>
                              <div>
                                <span className="text-slate-400">Status:</span>{' '}
                                <span className="uppercase font-semibold">{page.status}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Structure:</span>{' '}
                                <strong>
                                  {page.layoutJSON?.sections?.length || 0} sections,{' '}
                                  {countBlocksInLayout(page.layoutJSON)} blocks
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-400">Meta Title:</span>{' '}
                                {page.seo?.metaTitle || '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section-by-Section Structure Breakdown */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Layers size={14} className="text-blue-600" />
                          Sections in Snapshot v{selectedVersion.versionNumber}
                        </h4>
                        {(selectedVersion.snapshot.layoutJSON?.sections || []).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No sections in this snapshot.</p>
                        ) : (
                          <div className="space-y-2">
                            {selectedVersion.snapshot.layoutJSON.sections.map((sec, idx) => {
                              const blocks = (sec.columns || []).flatMap(c => c.blocks || []);
                              const currentHasSection = (page.layoutJSON?.sections || []).some(
                                s => s.id === sec.id
                              );
                              return (
                                <div
                                  key={sec.id}
                                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                      {idx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-800">
                                          Section #{idx + 1}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">
                                          ({sec.columns.length} col • {blocks.length} blocks)
                                        </span>
                                        {!currentHasSection && (
                                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                            Removed in current
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {blocks.map(b => (
                                          <span
                                            key={b.id}
                                            className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600 uppercase"
                                          >
                                            {b.type}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <ChevronRight size={14} className="text-slate-400 shrink-0" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
