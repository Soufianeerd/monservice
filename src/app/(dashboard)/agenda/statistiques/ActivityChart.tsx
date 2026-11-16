'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type ActivityChartPoint = { label: string; honored: number; noShow: number; cancelled: number };

export default function ActivityChart({ data }: { data: ActivityChartPoint[] }) {
  return (
    <div className="h-72 w-full" data-testid="practice-activity-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: '#f3f4f6' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="honored" name="Honorés" stackId="a" fill="#4f46e5" />
          <Bar dataKey="noShow" name="Absences" stackId="a" fill="#f59e0b" />
          <Bar dataKey="cancelled" name="Annulés" stackId="a" fill="#9ca3af" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
