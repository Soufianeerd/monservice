export function cleanupLocalStorage() {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('monservice_data_') || key === 'monservice_user_id') {
      localStorage.removeItem(key);
    }
  });
}
