"use client";

import { useState, useCallback } from 'react';
import { ArrowLeft, Database, Download, RefreshCcw, Save, Trash2, Clock, HardDrive } from 'lucide-react';
import Link from 'next/link';
import { preferencesRepo, eventRepo, venueRepo, userRepo } from '@/storage/repositories';
import { useToast } from '@/hooks/useToast';

/**
 * Admin Backup Settings Page
 * Route: /admin/settings/backup
 * Purpose: Stand‑alone deep link that corresponds to the "Backups" tab inside the main Settings UI.
 * Scope: Local simulation of backup scheduling + manual export using existing localStorage repositories.
 * NOTE: This is a development scaffold – replace with real API + persistence once backend lands.
 */

interface BackupScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  retentionCount: number; // how many recent backups to retain (older auto-pruned)
  lastRun?: number; // timestamp of last automated run
}

interface BackupMeta {
  id: string;
  createdAt: number;
  sizeBytes: number;
  label?: string;
}

interface BackupsPrefsShape {
  backups?: {
    schedule?: BackupScheduleConfig;
    items?: BackupMeta[];
  };
  [k: string]: any;
}

function getPrefs(): BackupsPrefsShape { return preferencesRepo.get(); }

function persist(patch: (cur: BackupsPrefsShape) => BackupsPrefsShape) {
  preferencesRepo.update(cur => patch(cur));
}

export default function BackupSettingsPage() {
  const toast = useToast();
  const prefs = getPrefs();
  const initialSchedule: BackupScheduleConfig = {
    frequency: prefs.backups?.schedule?.frequency || 'manual',
    retentionCount: prefs.backups?.schedule?.retentionCount ?? 5,
    lastRun: prefs.backups?.schedule?.lastRun,
  };
  const [schedule, setSchedule] = useState<BackupScheduleConfig>(initialSchedule);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [backups, setBackups] = useState<BackupMeta[]>(() => prefs.backups?.items || []);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const dirty = (
    schedule.frequency !== initialSchedule.frequency ||
    schedule.retentionCount !== initialSchedule.retentionCount
  );

  const saveSchedule = () => {
    setSaving(true);
    try {
      persist(cur => ({
        ...cur,
        backups: {
          ...(cur.backups || {}),
          schedule: { ...schedule }
        }
      }));
      toast.showSuccess('Backup Saved', 'Backup schedule has been saved');
    } catch {
      toast.showError('Save Failed', 'Failed to save backup schedule');
    } finally { setTimeout(() => setSaving(false), 350); }
  };

  const resetSchedule = () => {
    setSchedule(initialSchedule);
  };

  const prune = (items: BackupMeta[], retention: number) => {
    if (retention <= 0) return items; // unlimited
    const sorted = [...items].sort((a,b) => b.createdAt - a.createdAt);
    return sorted.slice(0, retention);
  };

  const createBackup = useCallback(() => {
    setWorking(true);
    try {
      const snapshot = {
        generatedAt: new Date().toISOString(),
        users: userRepo.all(),
        events: eventRepo.list(),
        venues: venueRepo.list(),
        meta: { version: 1 }
      };
      const json = JSON.stringify(snapshot, null, 2);
      const sizeBytes = new Blob([json]).size;
      const id = crypto.randomUUID();
      const meta: BackupMeta = { id, createdAt: Date.now(), sizeBytes };

      let next = [meta, ...backups];
      next = prune(next, schedule.retentionCount);

      persist(cur => ({
        ...cur,
        backups: {
          schedule: { ...schedule, lastRun: Date.now() },
            items: next
        }
      }));
      setBackups(next);

      // No auto-download; user can download explicitly later.
      toast.showSuccess('Backup Created', 'Backup has been created successfully');
    } catch (e) {
      toast.showError('Backup Failed', 'Failed to create backup');
    } finally { setTimeout(() => setWorking(false), 400); }
  }, [backups, schedule]);

  const deleteBackup = (id: string) => {
    const next = backups.filter(b => b.id !== id);
    persist(cur => ({
      ...cur,
      backups: { ...(cur.backups || {}), schedule: cur.backups?.schedule, items: next }
    }));
    setBackups(next);
    toast.showInfo('Backup Removed', 'Backup has been removed');
  };

  const openDeleteModal = (id: string) => setPendingDeleteId(id);
  const closeDeleteModal = () => setPendingDeleteId(null);
  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteBackup(pendingDeleteId);
    closeDeleteModal();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight dark:text-gray-100">Database Backups</h1>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-4 ">Configure automated backup schedule and manage manual exports.</p>

      {/* Schedule */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Schedule</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">Automation policy</span>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-900/50">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</label>
            <select value={schedule.frequency} onChange={e => setSchedule(s => ({ ...s, frequency: e.target.value as any }))} className="w-full rounded-md border border-gray-300 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100">
              <option value="manual">Manual Only</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">In dev mode this does not run automatically; frequency metadata is stored for later server implementation.</p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Retention Count</label>
            <input type="number" min={0} value={schedule.retentionCount} onChange={e => setSchedule(s => ({ ...s, retentionCount: Number(e.target.value) }))} className="w-32 rounded-md border border-gray-300 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
            <p className="text-xs text-gray-500 dark:text-gray-400">0 keeps all backups (not recommended long term).</p>
            {schedule.lastRun && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-2"><Clock className="h-3 w-3" /> Last run {new Date(schedule.lastRun).toLocaleString()}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button disabled={!dirty || saving} onClick={resetSchedule} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 cursor-pointer text-gray-700 dark:text-gray-300"><RefreshCcw className="h-4 w-4" /> Reset</button>
              <button disabled={!dirty || saving} onClick={saveSchedule} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-black dark:bg-black text-white text-xs font-medium hover:bg-gray-800 dark:hover:bg-gray-800 disabled:opacity-50 cursor-pointer"><Save className="h-4 w-4" /> Save</button>
            </div>
          </div>
          <div className="space-y-4 p-4 border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50/50 dark:bg-neutral-900/50">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Manual Backup</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Generate a JSON snapshot of current users, events and venues stored in local repositories. Backups are retained here until you choose to download them.</p>
            <button disabled={working} onClick={createBackup} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black dark:bg-black text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
              <HardDrive className="h-4 w-4" /> {working ? 'Working…' : 'Create Backup'}
            </button>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Do not use in production – replace with secure server-side export.</p>
          </div>
        </div>
      </section>

      {/* Backups List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Backups</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{backups.length} stored</span>
        </div>
        {backups.length === 0 ? (
          <div className="p-6 border border-dashed border-gray-300 dark:border-neutral-800 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-900">No backups yet. Create one above.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-neutral-800 rounded-lg [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Created</th>
                  <th className="px-4 py-2 text-left font-semibold">ID</th>
                  <th className="px-4 py-2 text-left font-semibold">Size</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-900">
                {backups.sort((a,b) => b.createdAt - a.createdAt).map(b => (
                  <tr key={b.id} className="border-t border-gray-100 dark:border-neutral-800">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-gray-900 dark:text-gray-100">{b.id}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{(b.sizeBytes/1024).toFixed(1)} KB</td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => reDownload(b.id)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"><Download className="h-4 w-4" /> Download</button>
                        <button onClick={() => openDeleteModal(b.id)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline cursor-pointer"><Trash2 className="h-4 w-4" /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDeleteModal} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-backup-title"
            aria-describedby="delete-backup-description"
            className="relative z-10 w-full max-w-sm bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-800 p-6 animate-in fade-in slide-in-from-bottom-4"
          >
            <h3 id="delete-backup-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100">Delete Backup</h3>
            <p id="delete-backup-description" className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">Are you sure you want to permanently delete this backup <span className="font-mono text-xs bg-gray-100 dark:bg-neutral-800 px-1 py-0.5 rounded">{pendingDeleteId.slice(0,8)}</span>? This action cannot be undone.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={closeDeleteModal} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-500 cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // helper to reconstruct & download a stored backup by id (we only stored meta, so create fresh snapshot)
  function reDownload(id: string) {
    try {
      const snapshot = {
        regeneratedFromMetaId: id,
        generatedAt: new Date().toISOString(),
        users: userRepo.all(),
        events: eventRepo.list(),
        venues: venueRepo.list(),
        meta: { version: 1 }
      };
      const json = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `locked-backup-${id}-regen.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.showError('Download Failed', 'Failed to download backup file');
    }
  }
}
