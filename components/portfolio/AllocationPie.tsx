'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { AllocationSlice } from '@/lib/portfolio/calculations'

const COLORS = ['#6366f1', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#f59e0b']

interface Props {
  allocation: AllocationSlice[]
}

export function AllocationPie({ allocation }: Props) {
  if (allocation.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
        No positions yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={allocation}
          dataKey="value"
          nameKey="assetClass"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
        >
          {allocation.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) =>
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
          }
        />
        <Legend
          formatter={(value) => (
            <span className="capitalize text-xs text-zinc-600">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
