'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarSpec {
  key: string;
  name: string;
  color: string;
}

interface MonthlySeriesChartProps {
  data: ReadonlyArray<Record<string, string | number>>;
  bars: BarSpec[];
  height?: number;
  stacked?: boolean;
}

/**
 * Chart de barras mensual reutilizable para los dashboards por rol.
 * `bars` define las series a mostrar; cada una con su key, nombre legible y color.
 */
export default function MonthlySeriesChart({ data, bars, height = 260, stacked = false }: MonthlySeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #f1f5f9' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        {bars.map((b) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={b.color}
            stackId={stacked ? 'a' : undefined}
            radius={stacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
            maxBarSize={36}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
