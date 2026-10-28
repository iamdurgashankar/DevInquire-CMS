import React, { useState, useMemo } from 'react';
import {
  Shield,
  Users,
  Plus,
  Edit3,
  Trash2,
  FolderOpen,
  Layers,
  FileText,
  Layout,
  Repeat,
  Database,
  Settings,
  Activity,
  Lock,
  Eye,
  Check,
  X,
  Search,
  Sparkles,
  Upload,
  AlertTriangle,
  UserCheck,
  Sliders,
} from 'lucide-react';
import {
  AccessLevel,
  UserManagementItem,
  UserRolePreset,
  UserSectionPermissions,
  ROLE_PERMISSION_PRESETS,
  getPermissionsForRole,
} from '../types';
import { toast } from 'sonner';

interface UserManagementViewProps {
  users: UserManagementItem[];
  setUsers: React.Dispatch<React.SetStateAction<UserManagementItem[]>>;
  syncUserManagement: (user: UserManagementItem) => Promise<void>;
  deleteUserOnServer: (id: string) => Promise<void>;
  simulatedUser: UserManagementItem | null;
  onSimulateUser: (user: UserManagementItem | null) => void;
  openAddModalTrigger?: boolean;
  onCloseAddModalTrigger?: () => void;
}

const ROLE_PRESET_DESCRIPTIONS: Record<
  Exclude<UserRolePreset, 'Custom'>,
  { summary: string; badgeClass: string; highlight: string }
> = {
  Administrator: {
    summary: 'Unrestricted access to all CMS sections, schemas, media, settings, and RBAC.',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    highlight: 'Full System Control',
  },
  Editor: {
    summary: 'Create & publish pages, upload media, and edit collection entries without schema deletion.',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    highlight: 'Pages + Media Upload + Entries',
  },
  'Media Manager': {
    summary: 'Full ownership of Media Library (upload, organize, delete) with read-only content access.',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    highlight: 'Media Library Full Control',
  },
  'Collection Architect': {
    summary: 'Design collection schemas, manage entries, and configure Headless API endpoints.',
    badgeClass: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    highlight: 'Collections Schema + API',
  },
  'SEO Specialist': {
    summary: 'Manage SEO metadata, analytics integrations, and URL rewrites/redirects.',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    highlight: 'SEO + URL Rewrites',
  },
  Viewer: {
    summary: 'Read-only access to inspect pages, media assets, and collection entries.',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    highlight: 'Read-Only Auditor',
  },
};

export const getRoleBadgeStyle = (role: string): string => {
  if (role in ROLE_PRESET_DESCRIPTIONS) {
    return ROLE_PRESET_DESCRIPTIONS[role as Exclude<UserRolePreset, 'Custom'>].badgeClass;
  }
  return 'bg-indigo-100 text-indigo-700 border-indigo-200';
};

export const isCustomPermissionsForRole = (
  role: string,
  permissions?: UserSectionPermissions
): boolean => {
  if (!permissions) return false;
  if (!(role in ROLE_PERMISSION_PRESETS)) return true;
  const preset = ROLE_PERMISSION_PRESETS[role as Exclude<UserRolePreset, 'Custom'>];
  return (
    permissions.pages !== preset.pages ||
    permissions.templates !== preset.templates ||
    permissions.rewrites !== preset.rewrites ||
    permissions.headlessApi !== preset.headlessApi ||
    permissions.settings !== preset.settings ||
    permissions.seo !== preset.seo ||
    permissions.users !== preset.users ||
    permissions.media.level !== preset.media.level ||
    permissions.media.canUpload !== preset.media.canUpload ||
    permissions.media.canDelete !== preset.media.canDelete ||
    permissions.collections.level !== preset.collections.level ||
    permissions.collections.canEditEntries !== preset.collections.canEditEntries ||
    permissions.collections.canEditSchema !== preset.collections.canEditSchema ||
    permissions.collections.canDelete !== preset.collections.canDelete
  );
};

export const AccessLevelPill: React.FC<{
  level: AccessLevel;
  label?: string;
  compact?: boolean;
}> = ({ level, label, compact }) => {
  const styles: Record<AccessLevel, string> = {
    manage: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    view: 'bg-blue-50 text-blue-700 border-blue-200',
    none: 'bg-slate-100 text-slate-400 border-slate-200',
  };

  const levelText: Record<AccessLevel, string> = {
    manage: 'Manage',
    view: 'View',
    none: 'No Access',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-bold ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      } ${styles[level]}`}
    >
      {level === 'none' && <Lock size={10} />}
      {level === 'view' && <Eye size={10} />}
      {level === 'manage' && <Check size={10} />}
      <span>{label ? `${label}: ${levelText[level]}` : levelText[level]}</span>
    </span>
  );
};

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  setUsers,
  syncUserManagement,
  deleteUserOnServer,
  simulatedUser,
  onSimulateUser,
  openAddModalTrigger,
  onCloseAddModalTrigger,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'matrix' | 'roles'>('directory');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal state for Add / Edit User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<string>('Editor');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | 'Pending'>('Active');
  const [formPermissions, setFormPermissions] = useState<UserSectionPermissions>(() =>
    getPermissionsForRole('Editor')
  );
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserManagementItem | null>(null);

  React.useEffect(() => {
    if (openAddModalTrigger) {
      openCreateUserModal();
      onCloseAddModalTrigger?.();
    }
  }, [openAddModalTrigger]);

  const openCreateUserModal = (presetRole: string = 'Editor') => {
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormRole(presetRole);
    setFormStatus('Active');
    setFormPermissions(getPermissionsForRole(presetRole));
    setIsModalOpen(true);
  };

  const openEditUserModal = (targetUser: UserManagementItem) => {
    const resolvedPerms = getPermissionsForRole(targetUser.role, targetUser.permissions);
    setEditingUserId(targetUser.id);
    setFormName(targetUser.name);
    setFormEmail(targetUser.email);
    setFormRole(targetUser.role);
    setFormStatus(targetUser.status);
    setFormPermissions(resolvedPerms);
    setIsModalOpen(true);
  };

  const handleRolePresetChange = (nextRole: string) => {
    setFormRole(nextRole);
    if (nextRole !== 'Custom') {
      setFormPermissions(getPermissionsForRole(nextRole));
    }
  };

  const handleSaveUserModal = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Please enter both name and email address.');
      return;
    }

    const updatedItem: UserManagementItem = {
      id: editingUserId || `usr_${Math.random().toString(36).substring(2, 9)}`,
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      role: formRole,
      status: formStatus,
      lastActive: editingUserId
        ? users.find(u => u.id === editingUserId)?.lastActive || 'Just now'
        : 'Just now',
      permissions: formPermissions,
    };

    try {
      await syncUserManagement(updatedItem);
      setUsers(prev => {
        const exists = prev.some(u => u.id === updatedItem.id);
        return exists
          ? prev.map(u => (u.id === updatedItem.id ? updatedItem : u))
          : [...prev, updatedItem];
      });
      if (simulatedUser?.id === updatedItem.id) {
        onSimulateUser(updatedItem);
      }
      setIsModalOpen(false);
      toast.success(
        editingUserId
          ? `Updated granular permissions for ${updatedItem.name}`
          : `Added ${updatedItem.name} (${updatedItem.role})`
      );
    } catch (_err) {
      toast.error('Failed to save user permissions.');
    }
  };

  const handleQuickUpdateUserPermissions = async (
    targetUser: UserManagementItem,
    updater: (current: UserSectionPermissions) => UserSectionPermissions
  ) => {
    const currentPerms = getPermissionsForRole(targetUser.role, targetUser.permissions);
    const nextPerms = updater(currentPerms);
    const updatedUser: UserManagementItem = {
      ...targetUser,
      permissions: nextPerms,
    };
    setUsers(prev => prev.map(u => (u.id === targetUser.id ? updatedUser : u)));
    if (simulatedUser?.id === updatedUser.id) {
      onSimulateUser(updatedUser);
    }
    await syncUserManagement(updatedUser);
    toast.success(`Updated section permissions for ${targetUser.name}`);
  };

  const cycleAccessLevel = (current: AccessLevel): AccessLevel => {
    if (current === 'none') return 'view';
    if (current === 'view') return 'manage';
    return 'none';
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = userSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  // Summary metrics
  const metrics = useMemo(() => {
    const resolved = users.map(u => ({
      user: u,
      perms: getPermissionsForRole(u.role, u.permissions),
    }));
    return {
      total: users.length,
      admins: resolved.filter(r => r.perms.users === 'manage').length,
      mediaManagers: resolved.filter(
        r => r.perms.media.level === 'manage' && r.perms.media.canUpload
      ).length,
      collectionManagers: resolved.filter(
        r => r.perms.collections.level === 'manage' && r.perms.collections.canEditEntries
      ).length,
      schemaArchitects: resolved.filter(r => r.perms.collections.canEditSchema).length,
    };
  }, [users]);

  const setMediaLevelInForm = (level: AccessLevel) => {
    setFormPermissions(prev => ({
      ...prev,
      media: {
        level,
        canUpload: level === 'manage' ? true : false,
        canDelete: level === 'manage' ? prev.media.canDelete : false,
      },
    }));
  };

  const setCollectionsLevelInForm = (level: AccessLevel) => {
    setFormPermissions(prev => ({
      ...prev,
      collections: {
        level,
        canEditEntries: level === 'manage' ? true : false,
        canEditSchema: level === 'manage' ? prev.collections.canEditSchema : false,
        canDelete: level === 'manage' ? prev.collections.canDelete : false,
      },
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Shield size={20} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              User Management & Granular RBAC
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure role-based access controls and granular section permissions for Media Library,
            Collection Management, Pages, and System Settings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-navigation tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('directory')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'directory'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users size={14} />
              <span>Team Directory</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('matrix')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders size={14} />
              <span>Permission Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('roles')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubTab === 'roles'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield size={14} />
              <span>Role Presets</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateUserModal('Editor')}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* RBAC Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest">Total Users</span>
            <Users size={15} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Active workspace members</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest">Media Library</span>
            <FolderOpen size={15} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.mediaManagers}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Can upload & manage assets</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest">Collections</span>
            <Layers size={15} className="text-cyan-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.collectionManagers}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Can author & edit entries</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest">Schema Architects</span>
            <Database size={15} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.schemaArchitects}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Can modify collection schemas</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest">RBAC Admins</span>
            <Shield size={15} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.admins}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Full security & role control</p>
        </div>
      </div>

      {/* Role Presets View */}
      {activeSubTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Object.keys(ROLE_PERMISSION_PRESETS) as Exclude<UserRolePreset, 'Custom'>[]).map(
            roleName => {
              const preset = ROLE_PERMISSION_PRESETS[roleName];
              const meta = ROLE_PRESET_DESCRIPTIONS[roleName];
              const count = users.filter(u => u.role === roleName).length;

              return (
                <div
                  key={roleName}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-blue-300 hover:shadow-lg transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full border ${meta.badgeClass}`}
                      >
                        {roleName}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {count} {count === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-5">{meta.summary}</p>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <FolderOpen size={13} className="text-emerald-600" />
                          Media Library
                        </span>
                        <div className="flex items-center gap-1">
                          <AccessLevelPill level={preset.media.level} compact />
                          {preset.media.canUpload && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                              +Upload
                            </span>
                          )}
                          {preset.media.canDelete && (
                            <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-bold">
                              +Delete
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Layers size={13} className="text-cyan-600" />
                          Collections
                        </span>
                        <div className="flex items-center gap-1">
                          <AccessLevelPill level={preset.collections.level} compact />
                          {preset.collections.canEditEntries && (
                            <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[10px] font-bold">
                              +Entries
                            </span>
                          )}
                          {preset.collections.canEditSchema && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">
                              +Schema
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <FileText size={13} className="text-blue-600" />
                          Pages & Templates
                        </span>
                        <AccessLevelPill level={preset.pages} compact />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Activity size={13} className="text-amber-600" />
                          SEO & Rewrites
                        </span>
                        <AccessLevelPill level={preset.seo} compact />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCreateUserModal(roleName)}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Assign to New User</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const demoUserForRole: UserManagementItem = {
                          id: `sim_${roleName}`,
                          name: `${roleName} Preview`,
                          email: `${roleName.toLowerCase().replace(/\s+/g, '.')}@devinquire.com`,
                          role: roleName,
                          status: 'Active',
                          lastActive: 'Simulated Session',
                          permissions: getPermissionsForRole(roleName),
                        };
                        onSimulateUser(demoUserForRole);
                        toast.info(`Simulating UI sections as "${roleName}"`);
                      }}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      title="Preview Dashboard UI with this role's permissions"
                    >
                      <Eye size={13} />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Team Directory View */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Filter users by name, email, or role..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={() => setUserSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                'ALL',
                'Administrator',
                'Editor',
                'Media Manager',
                'Collection Architect',
                'SEO Specialist',
                'Viewer',
              ].map(roleOpt => (
                <button
                  key={roleOpt}
                  type="button"
                  onClick={() => setRoleFilter(roleOpt)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                    roleFilter === roleOpt
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {roleOpt === 'ALL' ? 'All Roles' : roleOpt}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Team Member
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Role & Status
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Media Library Access
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Collection Management
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Other UI Sections
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No team members match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const perms = getPermissionsForRole(u.role, u.permissions);
                      const isCustom = isCustomPermissionsForRole(u.role, perms);
                      const isSimulatingThis = simulatedUser?.id === u.id;

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/70 transition-colors group ${
                            isSimulatingThis ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          {/* User Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                                {u.name
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {u.name}
                                  </p>
                                  {isSimulatingThis && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                                      Previewing
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role & Status */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-start gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                                    u.role
                                  )}`}
                                >
                                  {u.role}
                                </span>
                                {isCustom && (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold uppercase">
                                    Customized
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    u.status === 'Active'
                                      ? 'bg-emerald-500'
                                      : u.status === 'Pending'
                                      ? 'bg-amber-500'
                                      : 'bg-slate-300'
                                  }`}
                                />
                                <span>{u.status}</span>
                                <span>·</span>
                                <span className="text-slate-400">{u.lastActive}</span>
                              </div>
                            </div>
                          </td>

                          {/* Media Library Granular Access */}
                          <td className="px-5 py-4">
                            <div className="space-y-1.5">
                              <AccessLevelPill level={perms.media.level} />
                              {perms.media.level !== 'none' && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      perms.media.canUpload
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-400 line-through'
                                    }`}
                                  >
                                    Upload
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      perms.media.canDelete
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-slate-100 text-slate-400 line-through'
                                    }`}
                                  >
                                    Delete
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Collection Management Granular Access */}
                          <td className="px-5 py-4">
                            <div className="space-y-1.5">
                              <AccessLevelPill level={perms.collections.level} />
                              {perms.collections.level !== 'none' && (
                                <div className="flex flex-wrap items-center gap-1">
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      perms.collections.canEditEntries
                                        ? 'bg-cyan-50 text-cyan-700'
                                        : 'bg-slate-100 text-slate-400 line-through'
                                    }`}
                                  >
                                    Entries
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      perms.collections.canEditSchema
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'bg-slate-100 text-slate-400 line-through'
                                    }`}
                                  >
                                    Schema
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      perms.collections.canDelete
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-slate-100 text-slate-400 line-through'
                                    }`}
                                  >
                                    Delete
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Other UI Sections Summary */}
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[230px]">
                              <AccessLevelPill level={perms.pages} label="Pages" compact />
                              <AccessLevelPill level={perms.templates} label="Templates" compact />
                              <AccessLevelPill level={perms.seo} label="SEO" compact />
                              <AccessLevelPill level={perms.rewrites} label="Rewrites" compact />
                              <AccessLevelPill level={perms.headlessApi} label="API" compact />
                              <AccessLevelPill level={perms.settings} label="Settings" compact />
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSimulatingThis) {
                                    onSimulateUser(null);
                                    toast.info('Exited role preview mode');
                                  } else {
                                    onSimulateUser(u);
                                    toast.info(
                                      `Previewing CMS sections as ${u.name} (${u.role})`
                                    );
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  isSimulatingThis
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                                title="Simulate this user's RBAC permissions across the Dashboard"
                              >
                                <Eye size={13} />
                                <span className="hidden xl:inline">
                                  {isSimulatingThis ? 'Stop Preview' : 'Preview UI'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditUserModal(u)}
                                className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                title="Configure granular section permissions"
                              >
                                <Edit3 size={13} />
                                <span className="hidden xl:inline">Permissions</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteConfirmUser(u)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Remove user"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Permission Matrix View */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Interactive Section Access Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Click any permission cell to cycle access levels (
                <span className="font-bold text-slate-700">No Access → View → Manage</span>) or
                toggle granular Media Library & Collection capabilities in real time.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <AccessLevelPill level="manage" compact />
              <AccessLevelPill level="view" compact />
              <AccessLevelPill level="none" compact />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5 sticky left-0 bg-slate-50 z-10">User / Role</th>
                  <th className="px-4 py-3.5 bg-emerald-50/40 text-emerald-900 border-x border-slate-200">
                    Media Library (Level / Upload / Delete)
                  </th>
                  <th className="px-4 py-3.5 bg-cyan-50/40 text-cyan-900 border-r border-slate-200">
                    Collections (Level / Entries / Schema / Delete)
                  </th>
                  <th className="px-3 py-3.5 text-center">Pages</th>
                  <th className="px-3 py-3.5 text-center">Templates</th>
                  <th className="px-3 py-3.5 text-center">Rewrites</th>
                  <th className="px-3 py-3.5 text-center">Headless API</th>
                  <th className="px-3 py-3.5 text-center">SEO</th>
                  <th className="px-3 py-3.5 text-center">Settings</th>
                  <th className="px-3 py-3.5 text-center">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map(u => {
                  const perms = getPermissionsForRole(u.role, u.permissions);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 sticky left-0 bg-white z-10 border-r border-slate-100">
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <span className="text-[10px] text-slate-400 font-semibold">{u.role}</span>
                      </td>

                      {/* Granular Media Library Cell */}
                      <td className="px-4 py-3.5 bg-emerald-50/10 border-x border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickUpdateUserPermissions(u, curr => {
                                const nextLevel = cycleAccessLevel(curr.media.level);
                                return {
                                  ...curr,
                                  media: {
                                    level: nextLevel,
                                    canUpload: nextLevel === 'manage',
                                    canDelete: nextLevel === 'manage' ? curr.media.canDelete : false,
                                  },
                                };
                              })
                            }
                            title="Click to cycle Media Library access level"
                          >
                            <AccessLevelPill level={perms.media.level} compact />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleQuickUpdateUserPermissions(u, curr => {
                                const nextUpload = !curr.media.canUpload;
                                return {
                                  ...curr,
                                  media: {
                                    ...curr.media,
                                    level: nextUpload ? 'manage' : curr.media.level,
                                    canUpload: nextUpload,
                                  },
                                };
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              perms.media.canUpload
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Upload
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleQuickUpdateUserPermissions(u, curr => {
                                const nextDelete = !curr.media.canDelete;
                                return {
                                  ...curr,
                                  media: {
                                    ...curr.media,
                                    level: nextDelete ? 'manage' : curr.media.level,
                                    canDelete: nextDelete,
                                  },
                                };
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              perms.media.canDelete
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>

                      {/* Granular Collections Cell */}
                      <td className="px-4 py-3.5 bg-cyan-50/10 border-r border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickUpdateUserPermissions(u, curr => {
                                const nextLevel = cycleAccessLevel(curr.collections.level);
                                return {
                                  ...curr,
                                  collections: {
                                    level: nextLevel,
                                    canEditEntries: nextLevel === 'manage',
                                    canEditSchema:
                                      nextLevel === 'manage' ? curr.collections.canEditSchema : false,
                                    canDelete:
                                      nextLevel === 'manage' ? curr.collections.canDelete : false,
                                  },
                                };
                              })
                            }
                            title="Click to cycle Collection Management access level"
                          >
                            <AccessLevelPill level={perms.collections.level} compact />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleQuickUpdateUserPermissions(u, curr => {
                                const nextEntries = !curr.collections.canEditEntries;
                                return {
                                  ...curr,
                                  collections: {
                                    ...curr.collections,
                                    level: nextEntries ? 'manage' : curr.collections.level,
                                    canEditEntries: nextEntries,
                                  },
                                };
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              perms.collections.canEditEntries
                                ? 'bg-cyan-600 text-white border-cyan-600'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Entries
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleQuickUpdateUserPermissions(u, curr => {
                                const nextSchema = !curr.collections.canEditSchema;
                                return {
                                  ...curr,
                                  collections: {
                                    ...curr.collections,
                                    level: nextSchema ? 'manage' : curr.collections.level,
                                    canEditSchema: nextSchema,
                                  },
                                };
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              perms.collections.canEditSchema
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Schema
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleQuickUpdateUserPermissions(u, curr => {
                                const nextDelete = !curr.collections.canDelete;
                                return {
                                  ...curr,
                                  collections: {
                                    ...curr.collections,
                                    level: nextDelete ? 'manage' : curr.collections.level,
                                    canDelete: nextDelete,
                                  },
                                };
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              perms.collections.canDelete
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>

                      {/* Standard Section Cells */}
                      {(
                        [
                          'pages',
                          'templates',
                          'rewrites',
                          'headlessApi',
                          'seo',
                          'settings',
                          'users',
                        ] as const
                      ).map(sectionKey => (
                        <td key={sectionKey} className="px-3 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickUpdateUserPermissions(u, curr => ({
                                ...curr,
                                [sectionKey]: cycleAccessLevel(curr[sectionKey]),
                              }))
                            }
                          >
                            <AccessLevelPill level={perms[sectionKey]} compact />
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit User & Granular RBAC Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingUserId
                      ? 'Configure User & Granular Section Permissions'
                      : 'Add Team Member & Assign RBAC Policy'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customize role presets and section-specific access for Media Library,
                    Collections, and CMS tools.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto space-y-8 flex-1">
              {/* Identity & Role Preset Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Elena Rostova"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="elena@devinquire.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Role Preset
                  </label>
                  <select
                    value={formRole}
                    onChange={e => handleRolePresetChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Administrator">Administrator (Full Access)</option>
                    <option value="Editor">Editor (Pages, Media Upload, Collection Entries)</option>
                    <option value="Media Manager">Media Manager (Media Library Full Control)</option>
                    <option value="Collection Architect">
                      Collection Architect (Schemas, Entries & API)
                    </option>
                    <option value="SEO Specialist">SEO Specialist (SEO & URL Rewrites)</option>
                    <option value="Viewer">Viewer (Read-Only Access)</option>
                    <option value="Custom">Custom Role Policy</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Account Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={e =>
                      setFormStatus(e.target.value as 'Active' | 'Inactive' | 'Pending')
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending Invitation</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Highlighted Deep Granular Section Controls: Media Library & Collection Management */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Media Library Granular Card */}
                <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-600 text-white rounded-xl">
                        <FolderOpen size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Media Library</h4>
                        <p className="text-[11px] text-slate-500">
                          Asset browsing, uploads & deletion
                        </p>
                      </div>
                    </div>
                    <AccessLevelPill level={formPermissions.media.level} />
                  </div>

                  {/* Level Segmented Control */}
                  <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                    {(['none', 'view', 'manage'] as AccessLevel[]).map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setMediaLevelInForm(lvl)}
                        className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                          formPermissions.media.level === lvl
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {lvl === 'none' ? 'No Access' : lvl === 'view' ? 'View Only' : 'Manage'}
                      </button>
                    ))}
                  </div>

                  {/* Granular Capability Checkboxes */}
                  <div className="space-y-2.5 pt-2">
                    <label
                      className={`flex items-center justify-between p-3 rounded-xl border bg-white transition-all cursor-pointer ${
                        formPermissions.media.level === 'none'
                          ? 'opacity-50 pointer-events-none border-slate-100'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Upload & Sync New Media Assets
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Allow uploading images and files to Firestore library
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formPermissions.media.canUpload}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormPermissions(prev => ({
                            ...prev,
                            media: {
                              ...prev.media,
                              level: checked ? 'manage' : prev.media.level,
                              canUpload: checked,
                            },
                          }));
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>

                    <label
                      className={`flex items-center justify-between p-3 rounded-xl border bg-white transition-all cursor-pointer ${
                        formPermissions.media.level === 'none'
                          ? 'opacity-50 pointer-events-none border-slate-100'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Delete Media Library Assets
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Allow permanent removal of images from the library
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formPermissions.media.canDelete}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormPermissions(prev => ({
                            ...prev,
                            media: {
                              ...prev.media,
                              level: checked ? 'manage' : prev.media.level,
                              canDelete: checked,
                            },
                          }));
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Collection Management Granular Card */}
                <div className="rounded-2xl border-2 border-cyan-100 bg-cyan-50/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-cyan-600 text-white rounded-xl">
                        <Layers size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Collection Management</h4>
                        <p className="text-[11px] text-slate-500">
                          Entries, data models & schema fields
                        </p>
                      </div>
                    </div>
                    <AccessLevelPill level={formPermissions.collections.level} />
                  </div>

                  {/* Level Segmented Control */}
                  <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                    {(['none', 'view', 'manage'] as AccessLevel[]).map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setCollectionsLevelInForm(lvl)}
                        className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                          formPermissions.collections.level === lvl
                            ? 'bg-cyan-600 text-white shadow-2xs'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {lvl === 'none' ? 'No Access' : lvl === 'view' ? 'View Only' : 'Manage'}
                      </button>
                    ))}
                  </div>

                  {/* Granular Capability Checkboxes */}
                  <div className="space-y-2 pt-1">
                    <label
                      className={`flex items-center justify-between p-2.5 rounded-xl border bg-white transition-all cursor-pointer ${
                        formPermissions.collections.level === 'none'
                          ? 'opacity-50 pointer-events-none border-slate-100'
                          : 'border-slate-200 hover:border-cyan-300'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Create & Edit Collection Entries
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Author, update, and publish structured content items
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formPermissions.collections.canEditEntries}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormPermissions(prev => ({
                            ...prev,
                            collections: {
                              ...prev.collections,
                              level: checked ? 'manage' : prev.collections.level,
                              canEditEntries: checked,
                            },
                          }));
                        }}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                      />
                    </label>

                    <label
                      className={`flex items-center justify-between p-2.5 rounded-xl border bg-white transition-all cursor-pointer ${
                        formPermissions.collections.level === 'none'
                          ? 'opacity-50 pointer-events-none border-slate-100'
                          : 'border-slate-200 hover:border-cyan-300'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Architect & Modify Collection Schemas
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Create collections, use AI Architect, and edit field types
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formPermissions.collections.canEditSchema}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormPermissions(prev => ({
                            ...prev,
                            collections: {
                              ...prev.collections,
                              level: checked ? 'manage' : prev.collections.level,
                              canEditSchema: checked,
                            },
                          }));
                        }}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                      />
                    </label>

                    <label
                      className={`flex items-center justify-between p-2.5 rounded-xl border bg-white transition-all cursor-pointer ${
                        formPermissions.collections.level === 'none'
                          ? 'opacity-50 pointer-events-none border-slate-100'
                          : 'border-slate-200 hover:border-cyan-300'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Delete Collections & Entries
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Allow permanent deletion of collections or items
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formPermissions.collections.canDelete}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormPermissions(prev => ({
                            ...prev,
                            collections: {
                              ...prev.collections,
                              level: checked ? 'manage' : prev.collections.level,
                              canDelete: checked,
                            },
                          }));
                        }}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional UI Sections Access Controls */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Additional UI Section Permissions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        key: 'pages',
                        label: 'Pages & Visual Editor',
                        desc: 'Create, edit, publish, and export site pages',
                        icon: <FileText size={15} className="text-blue-600" />,
                      },
                      {
                        key: 'templates',
                        label: 'Template Library',
                        desc: 'Create, import, and edit reusable templates',
                        icon: <Layout size={15} className="text-indigo-600" />,
                      },
                      {
                        key: 'rewrites',
                        label: 'URL Rewrites & Redirects',
                        desc: 'Configure 301/302 redirects and proxy rules',
                        icon: <Repeat size={15} className="text-amber-600" />,
                      },
                      {
                        key: 'headlessApi',
                        label: 'Headless API Explorer',
                        desc: 'View REST endpoints and live response payloads',
                        icon: <Database size={15} className="text-emerald-600" />,
                      },
                      {
                        key: 'seo',
                        label: 'SEO & Search Console',
                        desc: 'Audit SEO health and connect Search Console',
                        icon: <Activity size={15} className="text-rose-600" />,
                      },
                      {
                        key: 'settings',
                        label: 'Site Settings & Styles',
                        desc: 'Modify global typography, colors, and domains',
                        icon: <Settings size={15} className="text-slate-700" />,
                      },
                      {
                        key: 'users',
                        label: 'User & Role Management',
                        desc: 'Add users and modify RBAC policies',
                        icon: <Users size={15} className="text-purple-600" />,
                      },
                    ] as const
                  ).map(sec => (
                    <div
                      key={sec.key}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-2 bg-white rounded-xl border border-slate-200/80 shrink-0 mt-0.5">
                          {sec.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{sec.label}</p>
                          <p className="text-[10px] text-slate-500 truncate">{sec.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                        {(['none', 'view', 'manage'] as AccessLevel[]).map(lvl => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() =>
                              setFormPermissions(prev => ({
                                ...prev,
                                [sec.key]: lvl,
                              }))
                            }
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                              formPermissions[sec.key] === lvl
                                ? lvl === 'manage'
                                  ? 'bg-blue-600 text-white'
                                  : lvl === 'view'
                                  ? 'bg-slate-800 text-white'
                                  : 'bg-slate-200 text-slate-700'
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            {lvl === 'none' ? 'None' : lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setFormPermissions(getPermissionsForRole(formRole))}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Reset to "{formRole}" Default
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserModal}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all"
                >
                  {editingUserId ? 'Save Granular Permissions' : 'Create User Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Remove Team Member</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove <strong>{deleteConfirmUser.name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteConfirmUser;
                  setDeleteConfirmUser(null);
                  setUsers(prev => prev.filter(u => u.id !== target.id));
                  if (simulatedUser?.id === target.id) {
                    onSimulateUser(null);
                  }
                  await deleteUserOnServer(target.id);
                  toast.success(`Removed ${target.name}`);
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SectionAccessDenied: React.FC<{
  sectionTitle: string;
  requiredCapability: string;
  activeRoleName: string;
  isSimulating: boolean;
  onExitSimulation: () => void;
  onBackToDashboard: () => void;
}> = ({
  sectionTitle,
  requiredCapability,
  activeRoleName,
  isSimulating,
  onExitSimulation,
  onBackToDashboard,
}) => (
  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-8 shadow-sm animate-in fade-in duration-300">
    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-200/60">
      <Lock size={30} />
    </div>
    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold uppercase tracking-wider">
      RBAC Policy Enforcement · Role: {activeRoleName}
    </span>
    <h2 className="text-2xl font-black text-slate-900 mt-4 mb-2">
      Access to {sectionTitle} is Restricted
    </h2>
    <p className="text-sm text-slate-500 leading-relaxed mb-8">
      Your current role (<strong className="text-slate-700">{activeRoleName}</strong>) has{' '}
      <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono text-rose-600">
        No Access
      </code>{' '}
      configured for <strong>{sectionTitle}</strong>. Required permission:{' '}
      <span className="font-semibold text-slate-700">{requiredCapability}</span>.
    </p>
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={onBackToDashboard}
        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
      >
        Back to Dashboard
      </button>
      {isSimulating && (
        <button
          type="button"
          onClick={onExitSimulation}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
        >
          <Shield size={14} />
          <span>Exit Role Preview (Restore Admin)</span>
        </button>
      )}
    </div>
  </div>
);
