import { useEffect, useState } from 'react';

export function useSidebarState(isDrawerLayout: boolean, avatarUri: string) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if (!isDrawerLayout) {
      setDrawerOpen(false);
    }
  }, [isDrawerLayout]);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUri]);

  return {
    drawerOpen,
    setDrawerOpen,
    avatarError,
    setAvatarError,
  };
}
