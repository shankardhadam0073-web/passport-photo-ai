import localforage from 'localforage';

localforage.config({
  name: 'AIPassportPhoto',
  storeName: 'sessions', // Should be alphanumeric, with underscores
  description: 'Stores generated passport photo sessions'
});

export const saveSession = async (sessionData) => {
  try {
    const id = Date.now().toString();
    const session = {
      id,
      createdAt: new Date().toISOString(),
      ...sessionData
    };
    await localforage.setItem(id, session);
    return session;
  } catch (err) {
    console.error('Error saving session to IndexedDB:', err);
    throw err;
  }
};

export const getAllSessions = async () => {
  try {
    const sessions = [];
    await localforage.iterate((value) => {
      sessions.push(value);
    });
    // Sort descending by date
    return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.error('Error fetching sessions:', err);
    return [];
  }
};

export const getSessionById = async (id) => {
  try {
    return await localforage.getItem(id);
  } catch (err) {
    console.error('Error fetching session:', err);
    return null;
  }
};

export const deleteSession = async (id) => {
  try {
    await localforage.removeItem(id);
  } catch (err) {
    console.error('Error deleting session:', err);
  }
};
