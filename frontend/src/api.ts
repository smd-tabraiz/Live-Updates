const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const getHeaders = (isFormData = false) => {
  const token = localStorage.getItem('gov_jwt');
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  return headers;
};

export const login = async (credentials: any) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!response.ok) throw new Error('Invalid credentials');
  return response.json();
};

export const fetchReports = async () => {
  const response = await fetch(`${API_URL}/reports`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Failed to fetch reports');
  return response.json();
};

export const createReport = async (reportData: any, file?: File) => {
  const formData = new FormData();
  formData.append('reportData', JSON.stringify(reportData));
  if (file) formData.append('file', file);

  const response = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: getHeaders(true),
    body: formData
  });
  if (!response.ok) throw new Error('Failed to create report');
  return response.json();
};

export const updateReportStatus = async (id: string, status: string) => {
  const response = await fetch(`${API_URL}/reports/${id}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update report status');
  return response.json();
};
