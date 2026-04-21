import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface ProjectMutationInput {
  id: string
  verification?: string
  receiptSecret?: string
  jwksUri?: string
  maxTaskHoldTime?: number | null
  allowedTypes?: string[]
}

export interface ProjectUpdateInput {
  verification?: string
  receiptSecret?: string
  jwksUri?: string
  maxTaskHoldTime?: number | null
  allowedTypes?: string[]
}

export class ProjectHasTasksError extends Error {
  taskCount: number
  constructor(taskCount: number, message = 'Project has tasks') {
    super(message)
    this.name = 'ProjectHasTasksError'
    this.taskCount = taskCount
  }
}

export function useStats(projectId: string) {
  return useQuery({
    queryKey: ['stats', projectId],
    queryFn: async () => {
      const { data, error } = await api.projects({ id: projectId }).stats.get()
      if (error) throw error
      return data
    },
    enabled: !!projectId,
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

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProjectMutationInput) => {
      const { data, error } = await api.projects.post(input)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & ProjectUpdateInput) => {
      const { data, error } = await api.projects({ id }).patch(patch)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.projects({ id }).delete()
      if (error) {
        const status = (error as { status?: number }).status
        const value = (error as { value?: unknown }).value
        if (
          status === 409 &&
          value &&
          typeof value === 'object' &&
          'taskCount' in value &&
          typeof (value as { taskCount: unknown }).taskCount === 'number'
        ) {
          throw new ProjectHasTasksError(
            (value as { taskCount: number }).taskCount,
            (value as { error?: string }).error,
          )
        }
        throw error
      }
      return data
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['stats', id] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useClearProjectTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.projects({ id }).tasks.delete({ confirm: id })
      if (error) throw error
      return data
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['stats', id] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
