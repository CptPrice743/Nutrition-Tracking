import { useUiStore } from '../../store/uiStore';

const ServerWakeupBanner = (): JSX.Element | null => {
  const visible = useUiStore((state) => state.serverWakeupVisible);

  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--surface-hero)',
        backgroundImage: 'var(--hero-glow)',
        paddingLeft: 'var(--sidebar-width)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
        color: '#ffffff'
      }}
      className="md:!pl-[calc(var(--sidebar-width)+24px)]"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#2563eb',
            display: 'inline-block',
            animation: 'pulse 2s infinite'
          }}
          className="animate-pulse"
        />
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          Server waking up — first load takes ~30s
        </span>
      </div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Please wait...</span>
    </div>
  );
};

export default ServerWakeupBanner;
