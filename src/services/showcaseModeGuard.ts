import { supabase } from '../lib/supabase';

let showcaseModeCache: { enabled: boolean; message: string; timestamp: number } | null = null;
const CACHE_TTL = 60000;

export async function checkShowcaseMode(): Promise<{ enabled: boolean; message: string }> {
  if (showcaseModeCache && Date.now() - showcaseModeCache.timestamp < CACHE_TTL) {
    return {
      enabled: showcaseModeCache.enabled,
      message: showcaseModeCache.message
    };
  }

  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'showcase_mode')
      .maybeSingle();

    if (error) {
      console.error('Error checking showcase mode:', error);
      return { enabled: false, message: '' };
    }

    const enabled = data?.value?.enabled || false;
    const message = data?.value?.message || 'SHOWCASE MODE — NON-OPERATIONAL';

    showcaseModeCache = {
      enabled,
      message,
      timestamp: Date.now()
    };

    return { enabled, message };
  } catch (err) {
    console.error('Error checking showcase mode:', err);
    return { enabled: false, message: '' };
  }
}

export async function blockIfShowcaseMode(actionName: string = 'this action'): Promise<void> {
  const { enabled, message } = await checkShowcaseMode();

  if (enabled) {
    throw new Error(`${message}: Cannot execute ${actionName}`);
  }
}

export function wrapWithShowcaseModeCheck<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  actionName?: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    await blockIfShowcaseMode(actionName || 'mutation');
    return fn(...args);
  };
}

export function clearShowcaseModeCache(): void {
  showcaseModeCache = null;
}
