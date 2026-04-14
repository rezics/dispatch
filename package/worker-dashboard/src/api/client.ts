const BASE_URL = window.location.origin

export async function fetchStatus() {
  const res = await fetch(`${BASE_URL}/api/status`)
  return res.json()
}

export async function fetchTasks() {
  const res = await fetch(`${BASE_URL}/api/tasks`)
  return res.json()
}

export async function fetchConfig() {
  const res = await fetch(`${BASE_URL}/api/config`)
  return res.json()
}
