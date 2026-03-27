import { useUiStore } from '../../store/uiStore';

const ServerWakeupBanner = (): JSX.Element | null => {
  const visible = useUiStore((state) => state.serverWakeupVisible);

  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      Waking up the server... this may take ~30 seconds on first load.
    </div>
  );
};

export default ServerWakeupBanner;