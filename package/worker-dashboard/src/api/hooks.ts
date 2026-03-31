import { useQuery } from '@tanstack/react-query'
import { fetchStatus, fetchTasks, fetchConfig } from './client'

export function useWorkerStatus() {
  return useQuery({
    queryKey: ['worker-status'],
    queryFn: fetchStatus,
    refetchInterval: 5000,
  })
}

export function useWorkerTasks() {
  return useQuery({
    queryKey: ['worker-tasks'],
    queryFn: fetchTasks,
    refetchInterval: 5000,
  })
}

export function useWorkerConfig() {
  return useQuery({
    queryKey: ['worker-config'],
    queryFn: fetchConfig,
    refetchInterval: 30000,
  })
}
