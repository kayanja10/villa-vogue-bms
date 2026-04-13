// ════════════════════════════════════════════════════════════════
// FILE: src/lib/api.js  (FRONTEND)
// INSTRUCTION: Find the `export const feedback = { ... }` block
// and REPLACE the entire thing with this version below.
// ════════════════════════════════════════════════════════════════

export const feedback = {
  // existing staff/admin methods — keep these
  list:   ()    => api.get('/feedback'),
  stats:  ()    => api.get('/feedback/stats'),
  create: (d)   => api.post('/feedback', d),
  delete: (id)  => api.delete(`/feedback/${id}`),

  // NEW — public methods used by CustomerPortal (no auth needed)
  publicList:   ()  => api.get('/feedback/public'),
  publicStats:  ()  => api.get('/feedback/public-stats'),
  publicCreate: (d) => api.post('/feedback/public', d),
};
