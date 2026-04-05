import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'

export function useRealtime<T>(
  table: string,
  initialData: T[] = [],
  options: {
    filter?: string
    orderBy?: string
    ascending?: boolean
  } = {}
) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      let query = supabase.from(table).select('*')
      
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true })
      }

      const { data: result, error: err } = await query
      
      if (err) throw err
      setData(result as T[] || [])
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [table, options.orderBy, options.ascending])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useSingleRealtime<T>(
  table: string,
  id: string
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const { data: result, error: err } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()
      
      if (err) throw err
      setData(result as T)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [table, id])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel(`${table}-${id}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `id=eq.${id}` }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, id, fetchData])

  return { data, loading, error, refetch: fetchData }
}
