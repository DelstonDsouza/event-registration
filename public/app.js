// public/app.js
async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  return res.json();
}

// DOM
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const eventForm = document.getElementById('eventForm');
const dashboard = document.getElementById('dashboard');
const authForms = document.getElementById('auth-forms');
const userName = document.getElementById('userName');
const registrationsList = document.getElementById('registrationsList');
const logoutBtn = document.getElementById('logoutBtn');

async function loadMe() {
  const res = await api('/api/me');
  if (res.user) {
    showDashboard(res.user);
  } else {
    showAuth();
  }
}

function showDashboard(user) {
  authForms.classList.add('hidden');
  dashboard.classList.remove('hidden');
  userName.textContent = user.name;
  renderRegistrations(user.registrations || []);
}

function showAuth() {
  authForms.classList.remove('hidden');
  dashboard.classList.add('hidden');
}

function renderRegistrations(arr) {
  registrationsList.innerHTML = '';
  if (!arr || arr.length === 0) {
    registrationsList.innerHTML = '<li>No registrations yet.</li>';
    return;
  }
  arr.forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${r.eventName} — ${new Date(r.registeredAt).toLocaleString()}`;
    registrationsList.appendChild(li);
  });
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(registerForm).entries());
  const res = await api('/api/register', { method: 'POST', body: JSON.stringify(fd) });
  if (res.error) return alert(res.error);
  loadMe();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(loginForm).entries());
  const res = await api('/api/login', { method: 'POST', body: JSON.stringify(fd) });
  if (res.error) return alert(res.error);
  loadMe();
});

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(eventForm).entries());
  const res = await api('/api/event/register', { method: 'POST', body: JSON.stringify(fd) });
  if (res.error) return alert(res.error);
  alert(res.message || 'Registered for event');
  // reload user info
  loadMe();
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  showAuth();
});

loadMe();
