import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export function useStats(projectId: string) {
  return useQuery({
    queryKey: ['stats', projectId],
    queryFn: async () => {
      const { data, error } = await api.projects({ id: projectId }).stats.get()
      if (error) throw error
      return data
    },
    refetchInterval: 5000,
  })
}

export function useWorkers() {
  return useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data, error } = await api.workers.get()
      if (error) throw error
      return data
    },
    refetchInterval: 10000,
  })
}

export function useTasks(params: {
  project?: string
  status?: string
  type?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const { data, error } = await api.tasks.get({ query: params as Record<string, string> })
      if (error) throw error
      return data
    },
    refetchInterval: 10000,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data, error } = await api.tasks({ id }).get()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await api.projects.get()
      if (error) throw error
      return data
    },
    refetchInterval: 10000,
  })
}
