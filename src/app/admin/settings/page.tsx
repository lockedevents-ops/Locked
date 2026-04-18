"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Settings, Shield, Users, Database, Bell, Key, ServerCog, LifeBuoy, Activity, Cloud, Lock, Upload, RefreshCcw, Save } from 'lucide-react';
import { preferencesRepo } from '@/storage/repositories';
import { useFilteredStorageEvents } from '@/storage/events';
import { useToast } from '@/hooks/useToast';

// Wireframe: Admin Settings Page
// NOTE: Pure structure only. No hardcoded metrics, counts, or config values.
// Each tab area contains minimal semantic scaffolding ready for later feature implementation.

type SettingsTab = 'general' | 'security' | 'roles' | 'notifications' | 'api' | 'system' | 'integrations' | 'support' | 'activity' | 'backups' | 'privacy';

interface TabDef {
    id: SettingsTab;
    label: string;
    icon: any; // lucide component type
    description: string;
}

const TABS: TabDef[] = [
    { id: 'general', label: 'General', icon: Settings, description: 'Platform name, branding, regional preferences' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Authentication, session policies, password rules' },
    { id: 'roles', label: 'Roles & Access', icon: Users, description: 'Role definitions, permissions mapping, least privilege' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Channels, templates, delivery policies' },
    { id: 'api', label: 'API & Keys', icon: Key, description: 'API credentials, webhooks, rate limits' },
    { id: 'system', label: 'System Health', icon: ServerCog, description: 'Status, resource usage, background jobs' },
    { id: 'integrations', label: 'Integrations', icon: Cloud, description: 'External services, marketplace connectors' },
    { id: 'support', label: 'Support Center', icon: LifeBuoy, description: 'Ticket settings, SLAs, canned responses' },
    { id: 'activity', label: 'Audit & Activity', icon: Activity, description: 'Audit trails, export & retention policies' },
    { id: 'backups', label: 'Backups', icon: Database, description: 'Backup schedule, retention, restore actions' },
    { id: 'privacy', label: 'Privacy & Compliance', icon: Lock, description: 'Data policies, anonymization, user data requests' },
];

export default function AdminSettingsPage() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [subView, setSubView] = useState<string | null>(null); // For nested drill-downs later

    const handleSelectTab = useCallback((tab: SettingsTab) => {
        setActiveTab(tab);
        setSubView(null);
    }, []);

    return (
        <div className="space-y-8 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight dark:text-gray-100">Settings</h1>
                <p className="text-base text-gray-500 dark:text-gray-400">Configure platform behavior, policies, and operational tooling.</p>
            </div>

            {/* Tabs (horizontal scrollable) */}
            <div className="-mx-4 px-4 overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="flex flex-wrap gap-2">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        const isActive = t.id === activeTab;
                        return (
                            <button
                                key={t.id}
                                onClick={() => handleSelectTab(t.id)}
                                className={`group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-md border text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${isActive ? 'bg-black dark:bg-black text-white border-black dark:border-black' : 'bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-neutral-800'}`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active Tab Intro */}
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-5 shadow-sm">
                {(() => {
                    const meta = TABS.find(t => t.id === activeTab);
                    if (!meta) return null;
                    return (
                        <div className="space-y-1">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                {meta.label}
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">SECTION</span>
                            </h2>
                            <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed">{meta.description}</p>
                        </div>
                    );
                })()}
            </div>

            {/* Content Shell */}
            <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6 min-h-[320px] flex flex-col gap-6">
                {activeTab === 'general' && <GeneralSettings toast={toast} />}
                {activeTab === 'security' && <SecuritySettings toast={toast} />}
                {activeTab === 'roles' && (
                    <RolesAccessSettings toast={toast} />
                )}
                {activeTab === 'notifications' && (
                    <div className="space-y-6">
                        <PlaceholderBlock title="Channel Settings" />
                        <PlaceholderBlock title="Templates" />
                        <PlaceholderBlock title="Delivery Rules" />
                    </div>
                )}
                {activeTab === 'api' && (
                    <div className="space-y-6">
                        <PlaceholderBlock title="API Keys" />
                        <PlaceholderBlock title="Webhook Endpoints" />
                        <PlaceholderBlock title="Rate Limiting" />
                    </div>
                )}
                {activeTab === 'system' && (
                    <div className="space-y-6">
                        <PlaceholderBlock title="Runtime Status" />
                        <PlaceholderBlock title="Resource Utilization" />
                        <PlaceholderBlock title="Background Jobs" />
                    </div>
                )}
                {activeTab === 'integrations' && (
                    <div className="space-y-6">
                        <PlaceholderBlock title="Installed Integrations" />
                        <PlaceholderBlock title="Marketplace" />
                        <PlaceholderBlock title="Configuration" />
                    </div>
                )}
                {activeTab === 'support' && (
                    <div className="space-y-6">
                        <PlaceholderBlock title="Ticket Settings" />
                        <PlaceholderBlock title="SLA Policies" />
                        <PlaceholderBlock title="Canned Responses" />
                    </div>
                )}
                {activeTab === 'activity' && (
                    <div className="space-y-6">
                        <PlaceholderBlock title="Audit Log Retention" />
                        <PlaceholderBlock title="Export & Reporting" />
                        <PlaceholderBlock title="Monitoring Hooks" />
                    </div>
                )}
                {activeTab === 'backups' && (
                    <div className="space-y-6">
                        <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 text-sm text-primary flex items-start gap-3">
                            <Database className="h-5 w-5 mt-0.5" />
                            <p>
                                Looking for database export & manual backup actions? Use the dedicated page for a fuller experience: {' '}
                                <a href="/admin/settings/backup" className="underline font-medium hover:text-primary/80">Open Backup Console</a>.
                            </p>
                        </div>
                        <PlaceholderBlock title="Backup Schedule" />
                        <PlaceholderBlock title="Retention & Rotation" />
                        <PlaceholderBlock title="Restore Workflows" />
                    </div>
                )}
                {activeTab === 'privacy' && (
                    <div className="space-y-6">
                        <PlaceholderBlock title="Data Lifecycle" />
                        <PlaceholderBlock title="User Data Requests" />
                        <PlaceholderBlock title="Anonymization" />
                    </div>
                )}
            </div>
        </div>
    );
}

// Simple visual placeholder block component
function PlaceholderBlock({ title }: { title: string }) {
    return (
        <div className="border border-gray-200 dark:border-neutral-800 rounded-lg p-4 flex flex-col gap-2 bg-gray-50/50 dark:bg-neutral-700/50">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">Placeholder</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Structure only – replace with functional UI and dynamic data.
            </p>
            <div className="h-6 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-neutral-600 dark:via-neutral-500 dark:to-neutral-600 animate-pulse" />
        </div>
    );
}

// ---------------- General Settings Implementation ----------------
interface BrandingState { logoDataUrl?: string | null; }
interface RegionState { country?: string; timezone?: string; currency?: string; locale?: string; }
interface PrefsShape { platformName?: string; branding?: BrandingState; region?: RegionState; [k:string]:any; }

function GeneralSettings({ toast }: { toast: any }) {
    const [loading, setLoading] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<{ platformName: string; branding: BrandingState; region: RegionState }>(() => {
        const p: PrefsShape = preferencesRepo.get();
            return {
                platformName: p.platformName || '',
                branding: { logoDataUrl: p.branding?.logoDataUrl || null },
                region: { country: p.region?.country || '', timezone: p.region?.timezone || '', currency: p.region?.currency || '', locale: p.region?.locale || '' }
            };
    });

    // Sync when preferences updated elsewhere
    useFilteredStorageEvents(['PREFERENCES_UPDATED'], () => {
        const p: PrefsShape = preferencesRepo.get();
            setForm(f => ({
                platformName: p.platformName || f.platformName,
                branding: { ...f.branding, logoDataUrl: p.branding?.logoDataUrl ?? f.branding.logoDataUrl },
                region: { ...f.region, ...p.region }
            }));
        setDirty(false);
    }, []);

    const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
        setForm(f => ({ ...f, [key]: value }));
        setDirty(true);
    };

    const handleBrandingChange = (patch: Partial<BrandingState>) => {
        setForm(f => ({ ...f, branding: { ...f.branding, ...patch } }));
        setDirty(true);
    };

    const handleRegionChange = (patch: Partial<RegionState>) => {
        setForm(f => ({ ...f, region: { ...f.region, ...patch } }));
        setDirty(true);
    };

    const handleSelectLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            handleBrandingChange({ logoDataUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        setSaving(true);
        try {
            const payload: PrefsShape = preferencesRepo.get();
                    preferencesRepo.update(cur => ({
                        ...cur,
                        platformName: form.platformName.trim() || undefined,
                        branding: { ...(cur.branding || {}), logoDataUrl: form.branding.logoDataUrl || undefined },
                        region: { ...cur.region, ...form.region }
                    }));
            toast.showSuccess('Settings Saved', 'General settings have been saved');
            setDirty(false);
        } catch {
            toast.showError('Save Failed', 'Failed to save settings');
        } finally {
            setTimeout(() => setSaving(false), 400);
        }
    };

    const handleReset = () => {
        const p: PrefsShape = preferencesRepo.get();
            setForm({
                platformName: p.platformName || '',
                branding: { logoDataUrl: p.branding?.logoDataUrl || null },
                region: { country: p.region?.country || '', timezone: p.region?.timezone || '', currency: p.region?.currency || '', locale: p.region?.locale || '' }
            });
        setDirty(false);
    };

    return (
        <div className="space-y-8">
            {/* Platform Identity */}
            <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Platform Identity</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Public-facing information</span>
                </div>
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform Name</label>
                        <input
                            value={form.platformName}
                            onChange={e => update('platformName', e.target.value)}
                            placeholder="e.g. Locked Events"
                            className="w-full rounded-lg border border-gray-300 dark:border-neutral-800 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">The name users see throughout the platform.</p>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo</label>
                        <div className="flex items-center gap-4 border border-gray-200 dark:border-neutral-800 rounded-lg p-4 bg-gray-50 dark:bg-neutral-700">
                            <div className="h-20 w-20 rounded-lg border border-gray-300 dark:border-neutral-800 flex items-center justify-center bg-white dark:bg-neutral-900 overflow-hidden">
                                {form.branding.logoDataUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={form.branding.logoDataUrl} alt="Logo" className="object-contain h-full w-full" />
                                ) : (
                                    <span className="text-sm text-gray-400 dark:text-gray-500">No Logo</span>
                                )}
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer text-gray-700 dark:text-gray-300"
                                    >
                                        <Upload className="h-4 w-4" /> Upload Logo
                                    </button>
                                    {form.branding.logoDataUrl && (
                                        <button
                                            type="button"
                                            onClick={() => { handleBrandingChange({ logoDataUrl: null }); }}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-neutral-900 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">PNG or SVG recommended. Stored locally in development mode.</p>
                            </div>
                            <input ref={fileInputRef} onChange={handleSelectLogo} type="file" accept="image/*" className="hidden" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Regional Preferences */}
            <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Regional Preferences</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Localization settings</span>
                </div>
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                        <input 
                            value={form.region.country} 
                            onChange={e => handleRegionChange({ country: e.target.value })} 
                            placeholder="e.g. Ghana" 
                            className="w-full rounded-lg border border-gray-300 dark:border-neutral-800 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" 
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Primary country of operation</p>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                        <input 
                            value={form.region.timezone} 
                            onChange={e => handleRegionChange({ timezone: e.target.value })} 
                            placeholder="e.g. Africa/Accra" 
                            className="w-full rounded-lg border border-gray-300 dark:border-neutral-800 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" 
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Default timezone for dates and scheduling</p>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency Code</label>
                        <input 
                            value={form.region.currency} 
                            onChange={e => handleRegionChange({ currency: e.target.value.toUpperCase() })} 
                            placeholder="e.g. GHS" 
                            className="w-full rounded-lg border border-gray-300 dark:border-neutral-800 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" 
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Primary currency for payments and pricing</p>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Locale</label>
                        <input 
                            value={form.region.locale} 
                            onChange={e => handleRegionChange({ locale: e.target.value })} 
                            placeholder="e.g. en-GH" 
                            className="w-full rounded-lg border border-gray-300 dark:border-neutral-800 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" 
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Language and formatting standard</p>
                    </div>
                </div>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-between py-4 px-6 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-800 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">{dirty ? 'Unsaved changes' : 'All changes saved'}{saving && ' • Saving...'}</div>
                <div className="flex gap-3">
                    <button 
                        type="button" 
                        disabled={!dirty || saving} 
                        onClick={handleReset} 
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 cursor-pointer text-gray-700 dark:text-gray-300"
                    >
                        <RefreshCcw className="h-4 w-4" /> Reset
                    </button>
                    <button 
                        type="button" 
                        disabled={!dirty || saving} 
                        onClick={handleSave} 
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-black dark:bg-black text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
                    >
                        <Save className="h-4 w-4" /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------- Security Settings Implementation ----------------
interface SecurityPrefsShape {
    security?: {
        auth?: AuthPolicy;
        password?: PasswordPolicy;
        session?: SessionPolicy;
    };
    [k:string]:any;
}

interface AuthPolicy {
    allowEmailLogin?: boolean;
    allowPhoneLogin?: boolean;
    require2FA?: boolean;
    lockoutThreshold?: number;
    lockoutWindowMinutes?: number;
}
interface PasswordPolicy {
    minLength?: number;
    requireNumber?: boolean;
    requireUppercase?: boolean;
    requireSymbol?: boolean;
    expiryDays?: number;
    reuseHistory?: number;
}
interface SessionPolicy {
    idleTimeoutMinutes?: number;
    absoluteTimeoutHours?: number;
    allowConcurrentSessions?: boolean;
    refreshOnActivity?: boolean;
}

function SecuritySettings({ toast }: { toast: any }) {
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [auth, setAuth] = useState<AuthPolicy>(() => {
        const p: SecurityPrefsShape = preferencesRepo.get();
        return {
            allowEmailLogin: p.security?.auth?.allowEmailLogin ?? true,
            allowPhoneLogin: p.security?.auth?.allowPhoneLogin ?? true,
            require2FA: p.security?.auth?.require2FA ?? false,
            lockoutThreshold: p.security?.auth?.lockoutThreshold ?? 5,
            lockoutWindowMinutes: p.security?.auth?.lockoutWindowMinutes ?? 15,
        };
    });
    const [password, setPassword] = useState<PasswordPolicy>(() => {
        const p: SecurityPrefsShape = preferencesRepo.get();
        return {
            minLength: p.security?.password?.minLength ?? 8,
            requireNumber: p.security?.password?.requireNumber ?? true,
            requireUppercase: p.security?.password?.requireUppercase ?? true,
            requireSymbol: p.security?.password?.requireSymbol ?? false,
            expiryDays: p.security?.password?.expiryDays ?? 0,
            reuseHistory: p.security?.password?.reuseHistory ?? 3,
        };
    });
    const [session, setSession] = useState<SessionPolicy>(() => {
        const p: SecurityPrefsShape = preferencesRepo.get();
        return {
            idleTimeoutMinutes: p.security?.session?.idleTimeoutMinutes ?? 30,
            absoluteTimeoutHours: p.security?.session?.absoluteTimeoutHours ?? 24,
            allowConcurrentSessions: p.security?.session?.allowConcurrentSessions ?? true,
            refreshOnActivity: p.security?.session?.refreshOnActivity ?? true,
        };
    });

    useFilteredStorageEvents(['PREFERENCES_UPDATED'], () => {
        const p: SecurityPrefsShape = preferencesRepo.get();
    setAuth((a: AuthPolicy) => ({
            allowEmailLogin: p.security?.auth?.allowEmailLogin ?? a.allowEmailLogin,
            allowPhoneLogin: p.security?.auth?.allowPhoneLogin ?? a.allowPhoneLogin,
            require2FA: p.security?.auth?.require2FA ?? a.require2FA,
            lockoutThreshold: p.security?.auth?.lockoutThreshold ?? a.lockoutThreshold,
            lockoutWindowMinutes: p.security?.auth?.lockoutWindowMinutes ?? a.lockoutWindowMinutes,
        }));
    setPassword((ps: PasswordPolicy) => ({
            minLength: p.security?.password?.minLength ?? ps.minLength,
            requireNumber: p.security?.password?.requireNumber ?? ps.requireNumber,
            requireUppercase: p.security?.password?.requireUppercase ?? ps.requireUppercase,
            requireSymbol: p.security?.password?.requireSymbol ?? ps.requireSymbol,
            expiryDays: p.security?.password?.expiryDays ?? ps.expiryDays,
            reuseHistory: p.security?.password?.reuseHistory ?? ps.reuseHistory,
        }));
    setSession((s: SessionPolicy) => ({
            idleTimeoutMinutes: p.security?.session?.idleTimeoutMinutes ?? s.idleTimeoutMinutes,
            absoluteTimeoutHours: p.security?.session?.absoluteTimeoutHours ?? s.absoluteTimeoutHours,
            allowConcurrentSessions: p.security?.session?.allowConcurrentSessions ?? s.allowConcurrentSessions,
            refreshOnActivity: p.security?.session?.refreshOnActivity ?? s.refreshOnActivity,
        }));
        setDirty(false);
    }, []);

    const markDirty = () => setDirty(true);

    const updateAuth = (patch: Partial<AuthPolicy>) => { setAuth((a: AuthPolicy) => ({ ...a, ...patch })); markDirty(); };
    const updatePassword = (patch: Partial<PasswordPolicy>) => { setPassword((p: PasswordPolicy) => ({ ...p, ...patch })); markDirty(); };
    const updateSession = (patch: Partial<SessionPolicy>) => { setSession((s: SessionPolicy) => ({ ...s, ...patch })); markDirty(); };

    const handleSave = () => {
        setSaving(true);
        try {
            preferencesRepo.update(cur => ({
                ...cur,
                security: {
                    ...(cur.security || {}),
                    auth: { ...(cur.security?.auth || {}), ...auth },
                    password: { ...(cur.security?.password || {}), ...password },
                    session: { ...(cur.security?.session || {}), ...session },
                }
            }));
            toast.showSuccess('Settings Saved', 'Security settings have been saved');
            setDirty(false);
        } catch {
            toast.showError('Save Failed', 'Failed to save security settings');
        } finally{
            setTimeout(() => setSaving(false), 400);
        }
    };

    const handleReset = () => {
        const p: SecurityPrefsShape = preferencesRepo.get();
        setAuth({
            allowEmailLogin: p.security?.auth?.allowEmailLogin ?? true,
            allowPhoneLogin: p.security?.auth?.allowPhoneLogin ?? true,
            require2FA: p.security?.auth?.require2FA ?? false,
            lockoutThreshold: p.security?.auth?.lockoutThreshold ?? 5,
            lockoutWindowMinutes: p.security?.auth?.lockoutWindowMinutes ?? 15,
        });
        setPassword({
            minLength: p.security?.password?.minLength ?? 8,
            requireNumber: p.security?.password?.requireNumber ?? true,
            requireUppercase: p.security?.password?.requireUppercase ?? true,
            requireSymbol: p.security?.password?.requireSymbol ?? false,
            expiryDays: p.security?.password?.expiryDays ?? 0,
            reuseHistory: p.security?.password?.reuseHistory ?? 3,
        });
        setSession({
            idleTimeoutMinutes: p.security?.session?.idleTimeoutMinutes ?? 30,
            absoluteTimeoutHours: p.security?.session?.absoluteTimeoutHours ?? 24,
            allowConcurrentSessions: p.security?.session?.allowConcurrentSessions ?? true,
            refreshOnActivity: p.security?.session?.refreshOnActivity ?? true,
        });
        setDirty(false);
    };

    return (
        <div className="space-y-10">
            {/* Authentication Policies */}
            <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Authentication</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Login methods & safeguards</span>
                </div>
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-3 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-700/50">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Allowed Methods</h4>
                        <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={!!auth?.allowEmailLogin} onChange={e => updateAuth({ allowEmailLogin: e.target.checked })} className="mt-0.5" /> Email / Password
                        </label>
                        <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={!!auth?.allowPhoneLogin} onChange={e => updateAuth({ allowPhoneLogin: e.target.checked })} className="mt-0.5" /> Phone Number
                        </label>
                        <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={!!auth?.require2FA} onChange={e => updateAuth({ require2FA: e.target.checked })} className="mt-0.5" /> Require 2FA (beta)
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Uncheck a method to disable that entry point. 2FA simulated in dev.</p>
                    </div>
                    <div className="space-y-3 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-700/50">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Lockout</h4>
                        <div className="flex items-center gap-2">
                            <input type="number" min={1} value={auth?.lockoutThreshold} onChange={e => updateAuth({ lockoutThreshold: Number(e.target.value) })} className="w-24 rounded border border-gray-300 dark:border-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">failed attempts within</span>
                            <input type="number" min={1} value={auth?.lockoutWindowMinutes} onChange={e => updateAuth({ lockoutWindowMinutes: Number(e.target.value) })} className="w-24 rounded border border-gray-300 dark:border-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">After threshold hit, account is temporarily locked (simulation only).</p>
                    </div>
                </div>
            </section>

            {/* Password Rules */}
            <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Password Policy</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Complexity & rotation</span>
                </div>
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-3 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-700/50">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Complexity</h4>
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Min Length</label>
                            <input type="number" min={4} value={password?.minLength} onChange={e => updatePassword({ minLength: Number(e.target.value) })} className="w-24 rounded border border-gray-300 dark:border-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                        </div>
                        <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={!!password?.requireNumber} onChange={e => updatePassword({ requireNumber: e.target.checked })} className="mt-0.5" /> Require number
                        </label>
                        <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={!!password?.requireUppercase} onChange={e => updatePassword({ requireUppercase: e.target.checked })} className="mt-0.5" /> Require uppercase
                        </label>
                        <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={!!password?.requireSymbol} onChange={e => updatePassword({ requireSymbol: e.target.checked })} className="mt-0.5" /> Require symbol
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Rules applied during sign-up / reset (dev simulation).</p>
                    </div>
                    <div className="space-y-3 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-700/50">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rotation & Reuse</h4>
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Expiry (days)</label>
                            <input type="number" min={0} value={password?.expiryDays} onChange={e => updatePassword({ expiryDays: Number(e.target.value) })} className="w-28 rounded border border-gray-300 dark:border-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Reuse History</label>
                            <input type="number" min={0} value={password?.reuseHistory} onChange={e => updatePassword({ reuseHistory: Number(e.target.value) })} className="w-28 rounded border border-gray-300 dark:border-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">0 disables expiry / reuse restrictions.</p>
                    </div>
                </div>
            </section>

            {/* Session Management */}
            <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Session Management</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Lifecycle & behavior</span>
                </div>
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-3 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-700/50">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Timeouts</h4>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-gray-700 dark:text-gray-300 w-40">Idle Timeout (min)</label>
                                <input type="number" min={1} value={session?.idleTimeoutMinutes} onChange={e => updateSession({ idleTimeoutMinutes: Number(e.target.value) })} className="w-28 rounded border border-gray-300 dark:border-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-gray-700 dark:text-gray-300 w-40">Absolute Timeout (h)</label>
                                <input type="number" min={1} value={session?.absoluteTimeoutHours} onChange={e => updateSession({ absoluteTimeoutHours: Number(e.target.value) })} className="w-28 rounded border border-gray-300 dark:border-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Idle vs. hard session cap (simulation only in dev).</p>
                    </div>
                    <div className="space-y-3 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-700/50">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Behavior</h4>
                        <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={!!session?.allowConcurrentSessions} onChange={e => updateSession({ allowConcurrentSessions: e.target.checked })} className="mt-0.5" /> Allow multiple logins
                        </label>
                        <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={!!session?.refreshOnActivity} onChange={e => updateSession({ refreshOnActivity: e.target.checked })} className="mt-0.5" /> Extend session on activity
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">When disabled, session expires strictly at timeout limits.</p>
                    </div>
                </div>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-between py-4 px-6 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-800 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">{dirty ? 'Unsaved changes' : 'All changes saved'}{saving && ' • Saving...'}</div>
                <div className="flex gap-3">
                    <button type="button" disabled={!dirty || saving} onClick={handleReset} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 cursor-pointer text-gray-700 dark:text-gray-300">
                        <RefreshCcw className="h-4 w-4" /> Reset
                    </button>
                    <button type="button" disabled={!dirty || saving} onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-black dark:bg-black text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
                        <Save className="h-4 w-4" /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------- Roles & Access Settings Implementation ----------------
interface RoleDefinition {
    id: string; // internal key
    label: string; // display name
    description?: string;
    system?: boolean; // protected from deletion
    capabilities: string[]; // capability ids
}

interface RolesPrefsShape {
    rolesAccess?: {
        roles?: RoleDefinition[];
        capabilities?: string[]; // master list
        defaults?: { newUserRole?: string };
    };
    [k:string]:any;
}

const DEFAULT_CAPABILITIES = [
    'manage_users',
    'manage_events',
    'manage_venues',
    'view_reports',
    'manage_support',
    'manage_settings'
] as const;

const SYSTEM_ROLES: RoleDefinition[] = [
    { id: 'super_admin', label: 'Super Admin', description: 'Full unrestricted platform access', system: true, capabilities: [...DEFAULT_CAPABILITIES] },
    { id: 'admin', label: 'Admin', description: 'Operational management with limited system controls', system: true, capabilities: ['manage_users','manage_events','manage_venues','view_reports','manage_support'] },
    { id: 'support_agent', label: 'Support Agent', description: 'Support center operations only', system: true, capabilities: ['manage_support'] },
    { id: 'organizer', label: 'Organizer', description: 'Create and manage events', system: true, capabilities: ['manage_events'] },
    { id: 'user', label: 'User', description: 'Standard account – discovery & participation', system: true, capabilities: [] },
];

function RolesAccessSettings({ toast }: { toast: any }) {
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [capabilities, setCapabilities] = useState<string[]>(() => {
        const p: RolesPrefsShape = preferencesRepo.get();
        return p.rolesAccess?.capabilities && p.rolesAccess.capabilities.length > 0 ? p.rolesAccess.capabilities : [...DEFAULT_CAPABILITIES];
    });
    const [roles, setRoles] = useState<RoleDefinition[]>(() => {
        const p: RolesPrefsShape = preferencesRepo.get();
        if (p.rolesAccess?.roles && p.rolesAccess.roles.length) return p.rolesAccess.roles;
        return SYSTEM_ROLES;
    });
    const [defaults, setDefaults] = useState<{ newUserRole?: string }>(() => {
        const p: RolesPrefsShape = preferencesRepo.get();
        return { newUserRole: p.rolesAccess?.defaults?.newUserRole || 'user' };
    });
    const [newCapability, setNewCapability] = useState('');
    const [newRole, setNewRole] = useState({ label: '', description: '' });

    useFilteredStorageEvents(['PREFERENCES_UPDATED'], () => {
        const p: RolesPrefsShape = preferencesRepo.get();
        if (p.rolesAccess?.capabilities) setCapabilities(p.rolesAccess.capabilities);
        if (p.rolesAccess?.roles) setRoles(p.rolesAccess.roles);
        if (p.rolesAccess?.defaults) setDefaults(p.rolesAccess.defaults);
        setDirty(false);
    }, []);

    const markDirty = () => setDirty(true);

    const addCapability = () => {
        const val = newCapability.trim().toLowerCase().replace(/\s+/g,'_');
        if (!val) return;
        if (capabilities.includes(val)) { toast.warn('Capability exists'); return; }
        setCapabilities(prev => [...prev, val]);
        setNewCapability('');
        markDirty();
    };
    const removeCapability = (cap: string) => {
        if (DEFAULT_CAPABILITIES.includes(cap as any)) { toast.showError('System Capability', 'Cannot remove system capabilities'); return; }
        // remove from roles too
        setRoles(r => r.map(role => ({ ...role, capabilities: role.capabilities.filter(c => c !== cap) })));
        setCapabilities(prev => prev.filter(c => c !== cap));
        markDirty();
    };

    const toggleRoleCapability = (roleId: string, cap: string) => {
        setRoles(r => r.map(role => role.id === roleId ? { ...role, capabilities: role.capabilities.includes(cap) ? role.capabilities.filter(c => c !== cap) : [...role.capabilities, cap] } : role));
        markDirty();
    };

    const addCustomRole = () => {
        const label = newRole.label.trim();
        if (!label) return;
        const id = label.toLowerCase().replace(/[^a-z0-9]+/g,'-');
        if (roles.some(r => r.id === id)) { toast.warn('Role id exists'); return; }
        const def: RoleDefinition = { id, label, description: newRole.description.trim(), capabilities: [] };
        setRoles(r => [...r, def]);
        setNewRole({ label: '', description: '' });
        markDirty();
    };
    const deleteRole = (id: string) => {
        const role = roles.find(r => r.id === id);
        if (!role) return;
        if (role.system) { toast.showError('System Role', 'Cannot delete system roles'); return; }
        if (defaults.newUserRole === id) { toast.showError('Role In Use', 'This role is set as the default new user role'); return; }
        setRoles(r => r.filter(x => x.id !== id));
        markDirty();
    };

    const handleSave = () => {
        setSaving(true);
        try {
            preferencesRepo.update(cur => ({
                ...cur,
                rolesAccess: {
                    ...(cur.rolesAccess || {}),
                    capabilities: [...capabilities],
                    roles: roles.map(r => ({ ...r })),
                    defaults: { ...defaults }
                }
            }));
            toast.showSuccess('Settings Saved', 'Roles & access settings have been saved');
            setDirty(false);
        } catch {
            toast.showError('Save Failed', 'Failed to save roles & access settings');
        } finally { setTimeout(() => setSaving(false), 400); }
    };
    const handleReset = () => {
        const p: RolesPrefsShape = preferencesRepo.get();
        setCapabilities(p.rolesAccess?.capabilities?.length ? p.rolesAccess.capabilities : [...DEFAULT_CAPABILITIES]);
        setRoles(p.rolesAccess?.roles?.length ? p.rolesAccess.roles : SYSTEM_ROLES);
        setDefaults({ newUserRole: p.rolesAccess?.defaults?.newUserRole || 'user' });
        setDirty(false);
    };

    return (
        <div className="space-y-10">
            {/* Capabilities */}
            <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Capabilities</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Atomic permission units</span>
                </div>
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {capabilities.map(cap => (
                            <span key={cap} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-neutral-800">
                                {cap}
                                {!DEFAULT_CAPABILITIES.includes(cap as any) && (
                                    <button onClick={() => removeCapability(cap)} className="ml-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer" aria-label="Remove capability">×</button>
                                )}
                            </span>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <input value={newCapability} onChange={e => setNewCapability(e.target.value)} placeholder="Add capability (e.g. export_data)" className="flex-1 rounded-md border border-gray-300 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                        <button type="button" onClick={addCapability} className="px-4 py-2 text-sm font-medium rounded-md bg-black dark:bg-black text-white hover:bg-gray-800 dark:hover:bg-gray-800 cursor-pointer">Add</button>
                    </div>
                </div>
            </section>

            {/* Roles matrix */}
            <section className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Role Definitions</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Assign capabilities</span>
                </div>
                <div className="overflow-x-auto border border-gray-200 dark:border-neutral-800 rounded-lg [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-4 py-2 text-left font-semibold whitespace-nowrap">Role</th>
                                {capabilities.map(cap => (
                                    <th key={cap} className="px-4 py-2 font-semibold text-center whitespace-nowrap">{cap}</th>
                                ))}
                                <th className="px-2 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(role => (
                                <tr key={role.id} className="border-t border-gray-100 dark:border-neutral-800">
                                    <td className="px-4 py-2 align-top min-w-[160px]">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{role.label}</span>
                                            {role.description && <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.description}</span>}
                                            {role.system && <span className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded bg-gray-200 dark:bg-neutral-600 text-gray-700 dark:text-gray-300 font-medium uppercase tracking-wide">System</span>}
                                        </div>
                                    </td>
                                    {capabilities.map(cap => {
                                        const checked = role.capabilities.includes(cap);
                                        return (
                                            <td key={cap} className="px-4 py-2 text-center">
                                                <input type="checkbox" checked={checked} onChange={() => toggleRoleCapability(role.id, cap)} className="cursor-pointer" />
                                            </td>
                                        );
                                    })}
                                    <td className="px-2 py-2 text-center">
                                        {!role.system && (
                                            <button onClick={() => deleteRole(role.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer">Delete</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-700/50">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add Custom Role</h4>
                        <input value={newRole.label} onChange={e => setNewRole(r => ({ ...r, label: e.target.value }))} placeholder="Role label" className="w-full rounded-md border border-gray-300 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                        <textarea value={newRole.description} onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))} placeholder="Description (optional)" className="w-full rounded-md border border-gray-300 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[70px] bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
                        <button type="button" onClick={addCustomRole} className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-black dark:bg-black text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-800 cursor-pointer">Add Role</button>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Custom roles start with no capabilities.</p>
                    </div>
                    <div className="space-y-3 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-700/50">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Defaults</h4>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New User Role</label>
                        <select value={defaults.newUserRole} onChange={e => { setDefaults(d => ({ ...d, newUserRole: e.target.value })); markDirty(); }} className="w-full rounded-md border border-gray-300 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100">
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Applied when a user registers (simulation scope).</p>
                    </div>
                </div>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-between py-4 px-6 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-800 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">{dirty ? 'Unsaved changes' : 'All changes saved'}{saving && ' • Saving...'}</div>
                <div className="flex gap-3">
                    <button type="button" disabled={!dirty || saving} onClick={handleReset} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 cursor-pointer text-gray-700 dark:text-gray-300">
                        <RefreshCcw className="h-4 w-4" /> Reset
                    </button>
                    <button type="button" disabled={!dirty || saving} onClick={handleSave} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-black dark:bg-black text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
                        <Save className="h-4 w-4" /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
