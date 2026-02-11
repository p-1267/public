interface SystemJudgmentBannerProps {
  classification: 'CRITICAL' | 'UNSAFE' | 'CONCERNING' | 'ACCEPTABLE';
  count: number;
  description: string;
}

export function SystemJudgmentBanner({ classification, count, description }: SystemJudgmentBannerProps) {
  const getStyles = () => {
    switch (classification) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-900',
          border: 'border-red-700',
          text: 'text-white',
          icon: '🚨',
          action: 'IMMEDIATE ACTION REQUIRED'
        };
      case 'UNSAFE':
        return {
          bg: 'bg-red-600',
          border: 'border-red-500',
          text: 'text-white',
          icon: '⚠️',
          action: 'URGENT CORRECTION REQUIRED'
        };
      case 'CONCERNING':
        return {
          bg: 'bg-yellow-600',
          border: 'border-yellow-500',
          text: 'text-white',
          icon: '⚠',
          action: 'ATTENTION REQUIRED'
        };
      case 'ACCEPTABLE':
        return {
          bg: 'bg-green-600',
          border: 'border-green-500',
          text: 'text-white',
          icon: '✓',
          action: 'NO INTERVENTION REQUIRED'
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`${styles.bg} ${styles.text} border-4 ${styles.border} rounded-lg p-6 mb-6`}>
      <div className="flex items-center gap-4">
        <div className="text-6xl">{styles.icon}</div>
        <div className="flex-grow">
          <div className="text-3xl font-bold mb-2">
            SYSTEM JUDGMENT: {classification}
          </div>
          <div className="text-xl mb-2">{styles.action}</div>
          <div className="text-lg opacity-90">
            {count} situation{count !== 1 ? 's' : ''} classified as {classification}
          </div>
          <div className="text-base opacity-80 mt-2">{description}</div>
        </div>
      </div>
    </div>
  );
}
