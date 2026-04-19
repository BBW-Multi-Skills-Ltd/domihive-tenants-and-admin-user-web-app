const TENANT_STAT_TONE_CLASSES = Object.freeze({
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
});

export const getTenantStatToneClass = (tone = 'neutral') => {
  return TENANT_STAT_TONE_CLASSES[tone] || TENANT_STAT_TONE_CLASSES.neutral;
};

export const createTenantStat = ({ label, value, meta, icon, tone = 'neutral', iconClass }) => ({
  label,
  value,
  meta,
  icon,
  iconClass: iconClass || getTenantStatToneClass(tone)
});

export const createTenantStats = (items = []) => items.map((item) => createTenantStat(item));
