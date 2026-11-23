'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/client'

export type Department = { id: number; name: string; members: number }
export type Shift = { id: number; name: string; start_time: string; end_time: string; late_tolerance_minutes: number; members: number }

export function useOptions() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const reload = useCallback(async () => {
    const res = await api<{ departments: Department[]; shifts: Shift[] }>('/api/admin/options')
    setDepartments(res.departments)
    setShifts(res.shifts)
  }, [])
  useEffect(() => { reload().catch(() => {}) }, [reload])
  return { departments, shifts, reload }
}
