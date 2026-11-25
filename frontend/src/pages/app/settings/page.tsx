import TelegramSettings from './TelegramSettings';
import { download, errorMessage, requestBlob, send } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import type { Preferences, SessionRow } from '@/lib/contracts';
import ApiStatus from '@/components/base/ApiStatus';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Button from '@/components/base/Button';
import Modal from '@/components/base/Modal';
import { Field, Switch, inputClass } from '@/components/base/Controls';
import { initials } from '@/lib/format';

const tabs = [
  { key: 'profile', label: 'Profile', icon: 'ri-user-3-line' },
  { key: 'monitoring', label: 'Monitoring', icon: 'ri-radar-line' },
  { key: 'notifications', label: 'Notifications', icon: 'ri-notification-3-line' },
  { key: 'appearance', label: 'Appearance', icon: 'ri-palette-line' },
  { key: 'security', label: 'Security', icon: 'ri-shield-keyhole-line' },
  { key: 'account', label: 'Account', icon: 'ri-user-settings-line' },
];

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-background-200 bg-background-50">
      <div className="border-b border-background-200 px-4 py-3.5">
        <h2 className="font-heading text-[15px] font-semibold text-foreground-950">{title}</h2>
        <p className="mt-0.5 text-[11.5px] text-foreground-500">{description}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser, clear, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { pushToast, perform, revision, refresh } = useWorkspace();
  const navigate = useNavigate();
  const [query, setQuery] = useSearchParams();
  const tab = tabs.find((item) => item.key === query.get('tab'))?.key ?? 'profile';
  const setTab = (value: string) => setQuery({ tab: value }, { replace: true });
  const preferences=useApiResource<Preferences>('/me/preferences');
  const sessions=useApiResource<SessionRow[]>(tab==='security'?'/me/sessions':null,revision);
  const [profilePassword,setProfilePassword]=useState('');
  const [deletePassword,setDeletePassword]=useState('');
  const [avatar,setAvatar]=useState<string>();
  const avatarInput=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(!user?.avatarUrl)return;
    let running=true;
    let url:string|undefined;
    requestBlob('/avatars/'+user.id).then(blob=>{
      if(running){url=URL.createObjectURL(blob);setAvatar(url);}
    }).catch(()=>{if(running)setAvatar(undefined);});
    return ()=>{running=false;if(url)URL.revokeObjectURL(url);};
  },[user?.id,user?.avatarUrl,revision]);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [frequency, setFrequency] = useState('6h');
  const [defaultDrop, setDefaultDrop] = useState('5');
  const [profileError, setProfileError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    inApp: true,
    drop: true,
    target: true,
    low: true,
    stock: true,
    increases: false,
    digest: true,
    autoPause: true,
    matchDuplicates: true,
    watchVariants: false,
    reducedMotion: false,
  });
  const setPref = (key: keyof typeof prefs, value: boolean) => setPrefs((current) => ({ ...current, [key]: value }));

  const incoming=preferences.data;
  useEffect(()=>{
    if(!incoming)return;
    const {frequency,defaultDrop,theme,...values}=incoming;
    setFrequency(frequency);setDefaultDrop(String(defaultDrop));setPrefs(values);setTheme(theme);
  },[incoming,setTheme]);
  const savePreferences=(patch:Partial<Preferences>)=>perform(()=>send('PATCH','/me/preferences',patch),'Preferences saved');
  const saveAvatar=(file?:File)=>void perform(async()=>{
    if(!file || file.size>128000)throw new Error('Choose an image under 128 kB.');
    const data=await new Promise<string>((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=reject;
      reader.onload=()=>resolve(String(reader.result).split(',')[1] ?? '');
      reader.readAsDataURL(file);
    });
    await send('PUT','/me/avatar',{mime:file.type,data});
    await refreshProfile();
  },'Avatar uploaded');
  const saveProfile = async () => {
    if (name.trim().length < 2) {
      setProfileError('Enter your full name');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setProfileError('Enter a valid email address');
      return;
    }
    setProfileError('');
    setBusy(true);
    try {
      const result=await updateUser({name:name.trim(),email:email.trim().toLowerCase(),currentPassword:profilePassword||undefined});
      if(result.needsVerification){navigate('/verify-email',{state:{email:email.trim()},replace:true});return;}
      setProfilePassword('');pushToast('Profile updated');
    } catch(error){setProfileError(errorMessage(error));}
    finally{setBusy(false);}
  };

  return (
    <div className="space-y-4">
      <ApiStatus loading={preferences.loading && !preferences.data} error={preferences.error ?? sessions.error} retry={refresh}/>
      <div>
        <h1 className="font-heading text-[22px] font-semibold tracking-[-0.025em] text-foreground-950 md:text-[25px]">
          Settings
        </h1>
        <p className="mt-1 text-[12.5px] text-foreground-500">
          Manage your workspace identity, monitoring defaults and account security.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[190px_1fr]">
        <div className="hide-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-background-200 bg-background-50 p-1.5 lg:sticky lg:top-[72px] lg:h-fit lg:flex-col lg:overflow-visible">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-colors cursor-pointer ${
                tab === item.key
                  ? 'bg-background-950/[0.06] text-foreground-950 dark:bg-background-50/10'
                  : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
              }`}
            >
              <i aria-hidden="true" className={`${item.icon} text-[14px] ${tab === item.key ? 'text-primary-600 dark:text-primary-400' : ''}`}></i>
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-w-0 space-y-3">
          {tab === 'profile' && (
            <Panel title="Profile" description="How your account appears inside the workspace.">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600/12 font-label text-[16px] font-semibold text-primary-700 dark:text-primary-400">
                  {initials(name || 'DA')}
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-foreground-900">{name || 'Unnamed'}</p>
                  <p className="text-[11px] text-foreground-500">{user?.plan} · joined {user?.joined}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="ml-auto"
                  icon="ri-image-add-line"
                  onClick={()=>avatarInput.current?.click()}
                >
                  Change photo
                </Button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Full name">
                  <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Email address">
                  <input value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} type="email" />
                </Field>
              </div>

              {profileError && (
                <p className="mt-2 flex items-center gap-1 text-[11.5px] text-danger-600">
                  <i aria-hidden="true" className="ri-error-warning-line text-xs"></i>
                  {profileError}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {email.trim().toLowerCase()!==user?.email && <label className="block text-sm">Current password for email changes<input className={inputClass} type="password" autoComplete="current-password" value={profilePassword} onChange={event=>setProfilePassword(event.target.value)}/></label>}
                <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event=>saveAvatar(event.target.files?.[0])}/>
                {avatar && <img src={avatar} alt="Profile avatar" className="h-10 w-10 rounded-lg object-cover"/>}
                <Button size="sm" onClick={saveProfile} disabled={busy}>
                  Save changes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setName(user?.name ?? '');
                    setEmail(user?.email ?? '');
                    setProfileError('');
                  }}
                >
                  Reset
                </Button>
              </div>

              <div className="mt-4 rounded-lg border border-background-200 bg-background-100/70 p-3">
                <p className="text-[10.5px] uppercase tracking-[0.1em] text-foreground-400">Account details</p>
                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
                  {[
                    { label: 'Workspace ID', value: user?.id ?? '-' },
                    { label: 'Currency', value: 'UZS (so‘m)' },
                    { label: 'Time zone', value: 'Asia/Tashkent' },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] text-foreground-400">{item.label}</p>
                      <p className="font-label text-[11px] text-foreground-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {tab === 'monitoring' && (
            <Panel title="Monitoring preferences" description="Defaults applied to newly tracked products.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Check frequency">
                  <select
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value)}
                    className={inputClass}
                  >
                    <option value="1h">Every hour</option>
                    <option value="6h">Every 6 hours</option>
                    <option value="12h">Every 12 hours</option>
                    <option value="24h">Once a day</option>
                  </select>
                </Field>
                <Field label="Default alert drop (%)" hint="Used when adding a product without a custom target.">
                  <input
                    value={defaultDrop}
                    onChange={(event) => setDefaultDrop(event.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="mt-4 space-y-3 border-t border-background-200 pt-3">
                <Switch
                  checked={prefs.autoPause}
                  onChange={(next) => setPref('autoPause', next)}
                  label="Pause monitoring for unavailable listings"
                  description="Stop checks after a listing is removed for 30 days."
                />
                <Switch
                  checked={prefs.matchDuplicates}
                  onChange={(next) => setPref('matchDuplicates', next)}
                  label="Match equivalent offers automatically"
                  description="Include the same model from other marketplaces in comparisons."
                />
                <Switch
                  checked={prefs.watchVariants}
                  onChange={(next) => setPref('watchVariants', next)}
                  label="Track colour and storage variants"
                  description="Create separate records instead of merging configurations."
                />
              </div>

              <Button size="sm" className="mt-4" onClick={()=>void savePreferences({frequency,defaultDrop:Number(defaultDrop),autoPause:prefs.autoPause,matchDuplicates:prefs.matchDuplicates,watchVariants:prefs.watchVariants})}>
                Save preferences
              </Button>
            </Panel>
          )}

          {tab === 'notifications' && (
            <Panel title="Notification preferences" description="Choose which events deserve your attention.">
              <div className="space-y-3">
                {[
                  { key: 'emailAlerts' as const, label: 'Email notifications', description: 'Send alerts to your account email.' },
                  { key: 'inApp' as const, label: 'In-app notifications', description: 'Show alerts in the notification center.' },
                  { key: 'drop' as const, label: 'Price drops', description: 'Any decrease of 3% or more.' },
                  { key: 'target' as const, label: 'Target price reached', description: 'When your price condition is satisfied.' },
                  { key: 'low' as const, label: 'Historical low', description: 'When a new lowest price is recorded.' },
                  { key: 'stock' as const, label: 'Availability changes', description: 'Back in stock or sold out.' },
                  { key: 'increases' as const, label: 'Price increases', description: 'Upward moves above 5%.' },
                  { key: 'digest' as const, label: 'Weekly digest', description: 'Summary of your products every Monday.' },
                ].map((item) => (
                  <div key={item.key}>
                    <Switch
                      checked={prefs[item.key]}
                      onChange={(next) => setPref(item.key, next)}
                      label={item.label}
                      description={item.description}
                    />
                  </div>
                ))}
              </div>
              <Button size="sm" className="mt-4" onClick={()=>void savePreferences({emailAlerts:prefs.emailAlerts,inApp:prefs.inApp,drop:prefs.drop,target:prefs.target,low:prefs.low,stock:prefs.stock,increases:prefs.increases,digest:prefs.digest})}>
                Save preferences
              </Button>
            </Panel>
          )}

          {tab === 'appearance' && (
            <Panel title="Appearance" description="Light, dark, or follow your operating system.">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  { key: 'light', label: 'Light', icon: 'ri-sun-line' },
                  { key: 'dark', label: 'Dark', icon: 'ri-moon-line' },
                  { key: 'system', label: 'System', icon: 'ri-computer-line' },
                ] as { key: ThemeMode; label: string; icon: string }[]).map((option) => {
                  const active = theme === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={async ()=>{if(await savePreferences({theme:option.key}))setTheme(option.key);}}
                      className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                        active ? 'border-foreground-950/30 bg-background-100' : 'border-background-200 hover:border-background-300'
                      }`}
                    >
                      <div
                        className={`mb-2 flex h-16 items-end gap-1 rounded-lg border p-1.5 ${
                          option.key === 'dark'
                            ? 'border-background-700 bg-foreground-950'
                            : option.key === 'light'
                              ? 'border-background-200 bg-background-100'
                              : 'border-background-300 bg-gradient-to-r from-background-100 to-foreground-950'
                        }`}
                      >
                        <span className={`h-6 flex-1 rounded ${option.key === 'dark' ? 'bg-background-700' : 'bg-background-50'}`}></span>
                        <span className={`h-3 flex-1 rounded ${option.key === 'dark' ? 'bg-background-600' : 'bg-background-300'}`}></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground-900">
                          <i aria-hidden="true" className={`${option.icon} text-[13px] text-foreground-500`}></i>
                          {option.label}
                        </span>
                        {active && <i aria-hidden="true" className="ri-check-line text-[14px] text-primary-600 dark:text-primary-400"></i>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3 border-t border-background-200 pt-3">
                <Switch
                  checked={prefs.reducedMotion}
                  onChange={async next=>{if(await savePreferences({reducedMotion:next})){setPref('reducedMotion',next);document.documentElement.classList.toggle('reduce-motion',next);}}}
                  label="Reduce interface motion"
                  description="Shorten page and chart animations."
                />
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed text-foreground-400">
                Appearance preferences are stored on this device. System mode follows your OS setting automatically.
              </p>
            </Panel>
          )}

          {tab === 'security' && (
            <>
              <Panel title="Change password" description="Use at least 6 characters.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Current password" className="sm:col-span-2">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="New password">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Confirm new password">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repeat password"
                      className={inputClass}
                    />
                  </Field>
                </div>
                {passwordError && (
                  <p className="mt-2 flex items-center gap-1 text-[11.5px] text-danger-600">
                    <i aria-hidden="true" className="ri-error-warning-line text-xs"></i>
                    {passwordError}
                  </p>
                )}
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={async () => {
                    if (currentPassword.length < 6) {
                      setPasswordError('Enter your current password (6+ characters)');
                      return;
                    }
                    if (newPassword.length < 6) {
                      setPasswordError('New password must be at least 6 characters');
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      setPasswordError('New passwords do not match');
                      return;
                    }
                    setPasswordError('');
                    try {await send('PUT','/me/password',{currentPassword,password:newPassword});refresh();}
                    catch(error){setPasswordError(errorMessage(error));return;}
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    pushToast('Password updated');
                  }}
                >
                  Update password
                </Button>
              </Panel>

              <Panel title="Active sessions" description="Devices currently signed in to this workspace.">
                <div className="divide-y divide-background-200">
                  {(sessions.data ?? []).map((session) => (
                    <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                      <div>
                        <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground-900">
                          {session.userAgent ?? "Unknown device"}
                          {session.current && (
                            <span className="rounded-full bg-primary-500/10 px-1.5 py-0.5 text-[9.5px] font-medium text-primary-700 dark:text-primary-400">
                              This device
                            </span>
                          )}
                        </p>
                        <p className="text-[10.5px] text-foreground-400">
                          Expires {new Date(session.expiresAt).toLocaleString()}
                        </p>
                      </div>
                      {!session.current && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={()=>void perform(()=>send('DELETE','/me/sessions/'+session.id),'Session revoked')}
                        >
                          Sign out
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {tab === 'account' && (
            <>
              <Panel title="Plan" description="Your current workspace plan.">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-background-200 bg-background-100/60 p-3">
                  <div>
                    <p className="text-[12.5px] font-medium text-foreground-900">Starter</p>
                    <p className="mt-0.5 text-[11px] text-foreground-500">
                      Product tracking and alerts included
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" disabled title="Billing is unavailable">
                    Manage plan
                  </Button>
                </div>
              </Panel>

              <Panel title="Telegram" description="Open your watchlist and alerts in Telegram.">
                <TelegramSettings />
              </Panel>

              <Panel title="Your data" description="Export or remove everything stored in this workspace.">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="ri-download-2-line"
                    onClick={()=>void perform(()=>download('/me/export','deal-alert-workspace.json'))}
                  >
                    Export workspace data
                  </Button>
                  <Button variant="danger" size="sm" icon="ri-delete-bin-line" onClick={() => setDeleteOpen(true)}>
                    Delete account
                  </Button>
                </div>
                <p className="mt-3 text-[10.5px] leading-relaxed text-foreground-400">
                  Deleting the account removes your tracked products, alerts and settings.
                </p>
              </Panel>
            </>
          )}
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete account"
        description="This cannot be undone. All tracked products, price history and alerts will be removed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Keep my account
            </Button>
            <Button
              variant="danger"
              disabled={!deletePassword || busy}
              onClick={async ()=>{
                setBusy(true);
                try {await send('DELETE','/me',{currentPassword:deletePassword});clear();navigate('/',{replace:true});}
                catch(error){pushToast(errorMessage(error),'error');}
                finally{setBusy(false);}
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <label className="block text-sm">Current password
          <input className={inputClass} autoComplete="current-password" type="password" value={deletePassword} onChange={event=>setDeletePassword(event.target.value)}/>
        </label>
      </Modal>
    </div>
  );
}