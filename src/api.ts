import type { Team, Location, Field, SlotConfig, User } from "./types"

// Thin fetch wrapper. Always sends the session cookie. Throws the server's
// {error} message on non-2xx so the UI can surface it. No localStorage fallback.
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`)
  return body as T
}

export interface Bootstrap {
  teams: Team[]
  locations: Location[]
  fields: Field[]
  slots: SlotConfig[]
}

export function bootstrap(): Promise<Bootstrap> {
  return req<Bootstrap>("/bootstrap")
}

export async function me(): Promise<User | null> {
  try {
    const { user } = await req<{ user: User }>("/auth/me")
    return user
  } catch {
    return null
  }
}

export async function login(email: string, password: string): Promise<User> {
  const { user } = await req<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  return user
}

export function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
): Promise<void> {
  return req<void>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ firstName, lastName, email, password }),
  })
}

export function logout(): Promise<void> {
  return req<void>("/auth/logout", { method: "POST" })
}

export async function reserve(
  slotId: string,
  teamId: string,
): Promise<SlotConfig> {
  const { slot } = await req<{ slot: SlotConfig }>("/reservations", {
    method: "POST",
    body: JSON.stringify({ slotId, teamId }),
  })
  return slot
}

export async function cancel(
  slotId: string,
  teamId: string,
): Promise<SlotConfig> {
  const { slot } = await req<{ slot: SlotConfig }>("/reservations", {
    method: "DELETE",
    body: JSON.stringify({ slotId, teamId }),
  })
  return slot
}

// Move a reservation to a different team and/or slot, re-validated server-side.
// Returns every slot whose occupancy changed (destination, and the vacated
// source when it differs) so the caller can refresh each in state.
export async function moveReservation(
  slotId: string,
  teamId: string,
  newSlotId: string,
  newTeamId: string,
): Promise<SlotConfig[]> {
  const { slots } = await req<{ slots: SlotConfig[] }>("/reservations", {
    method: "PATCH",
    body: JSON.stringify({ slotId, teamId, newSlotId, newTeamId }),
  })
  return slots
}

type Entity = "teams" | "locations" | "fields" | "slots" | "users"

export function adminList<T>(entity: Entity): Promise<T[]> {
  return req<T[]>(`/admin/${entity}`)
}
export function adminCreate<T>(entity: Entity, body: unknown): Promise<T> {
  return req<T>(`/admin/${entity}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}
export function adminUpdate<T>(entity: Entity, body: unknown): Promise<T> {
  return req<T>(`/admin/${entity}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
export function adminDelete(entity: Entity, id: string): Promise<{ ok: true }> {
  return req<{ ok: true }>(`/admin/${entity}`, {
    method: "DELETE",
    body: JSON.stringify({ id }),
  })
}

// Resolve coordinates from a street address, or fall back to name + city when
// no address is on file. The endpoint tries address first, then "name, city".
export function geocodeAddress(input: {
  address?: string
  name?: string
  city?: string
}): Promise<{ lat: number; lon: number }> {
  return req<{ lat: number; lon: number }>("/admin/geocode-address", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
