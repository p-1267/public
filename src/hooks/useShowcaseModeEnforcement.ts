import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useShowcaseModeEnforcement() {
  const [isShowcaseMode, setIsShowcaseMode] = useState(false);
  const [showcaseMessage, setShowcaseMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkShowcaseMode();
  }, []);

  const checkShowcaseMode = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'showcase_mode')
        .maybeSingle();

      if (error) {
        console.error('Error checking showcase mode:', error);
        return;
      }

      if (data && data.value) {
        setIsShowcaseMode(data.value.enabled || false);
        setShowcaseMessage(data.value.message || 'SHOWCASE MODE — NON-OPERATIONAL');
      }
    } catch (err) {
      console.error('Error checking showcase mode:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const blockIfShowcaseMode = useCallback((actionName: string = 'this action') => {
    if (isShowcaseMode) {
      throw new Error(`${showcaseMessage}: Cannot execute ${actionName}`);
    }
  }, [isShowcaseMode, showcaseMessage]);

  const wrapMutation = useCallback(<T extends any[], R>(
    mutationFn: (...args: T) => Promise<R>,
    actionName?: string
  ) => {
    return async (...args: T): Promise<R> => {
      if (isShowcaseMode) {
        throw new Error(`${showcaseMessage}: Cannot execute ${actionName || 'mutation'}`);
      }
      return mutationFn(...args);
    };
  }, [isShowcaseMode, showcaseMessage]);

  return {
    isShowcaseMode,
    showcaseMessage,
    loading,
    blockIfShowcaseMode,
    wrapMutation,
    checkShowcaseMode
  };
}
