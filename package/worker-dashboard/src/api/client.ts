const BASE_URL = window.location.origin

export async function fetchStatus() {
  const res = await fetch(`${BASE_URL}/status`)
  return res.json()
}

export async function fetchTasks() {
  const res = await fetch(`${BASE_URL}/tasks`)
  return res.json()
}

export async function fetchConfig() {
  const res = await fetch(`${BASE_URL}/config`)
  return res.json()
}
