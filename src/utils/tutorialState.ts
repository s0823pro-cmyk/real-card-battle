const KEY = 'real-card-battle:tutorial-seen';

export const hasTutorialSeen = (step: 'job_select' | 'battle'): boolean => {
  try {
    const val = JSON.parse(localStorage.getItem(KEY) || '{}');
    return !!val[step];
  } catch {
    return false;
  }
};

export const markTutorialSeen = (step: 'job_select' | 'battle'): void => {
  try {
    const val = JSON.parse(localStorage.getItem(KEY) || '{}');
    val[step] = true;
    localStorage.setItem(KEY, JSON.stringify(val));
  } catch {}
};

export const resetTutorial = (): void => {
  localStorage.removeItem(KEY);
};
