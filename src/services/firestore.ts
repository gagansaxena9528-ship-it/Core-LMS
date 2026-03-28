// Custom Firestore Service (Replaces Firebase)

export const createDoc = async (colPath: string, data: any, id?: string) => {
  const response = await fetch(`/api/data/${colPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, id })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Create failed');
  }
  return response.json();
};

export const getDocument = async (colPath: string, id: string) => {
  const response = await fetch(`/api/data/${colPath}/${id}`);
  if (!response.ok) return null;
  return response.json();
};

export const updateDocument = async (colPath: string, id: string, data: any) => {
  const response = await fetch(`/api/data/${colPath}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Update failed');
  }
  return response.json();
};

export const deleteDocument = async (colPath: string, id: string) => {
  const response = await fetch(`/api/data/${colPath}/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Delete failed');
  }
  return response.json();
};

// Aliases for easier use
export const addDoc = createDoc;
export const updateDoc = updateDocument;
export const deleteDoc = deleteDocument;

// Real-time Listeners (Simulated with polling for now)
export const subscribeToCollection = (colPath: string, callback: (data: any[]) => void) => {
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/data/${colPath}`);
      if (response.ok) {
        const data = await response.json();
        callback(data);
      }
    } catch (err) {
      console.error('Fetch collection error:', err);
    }
  };

  fetchData();
  const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
  return () => clearInterval(interval);
};

export const subscribeToQuery = (colPath: string, field: string, operator: any, value: any, callback: (data: any[]) => void) => {
  // Simple implementation: fetch all and filter client-side
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/data/${colPath}`);
      if (response.ok) {
        const data = await response.json();
        const filtered = data.filter((item: any) => {
          if (operator === '==') return item[field] === value;
          if (operator === 'array-contains') return Array.isArray(item[field]) && item[field].includes(value);
          return true;
        });
        callback(filtered);
      }
    } catch (err) {
      console.error('Fetch query error:', err);
    }
  };

  fetchData();
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
};
