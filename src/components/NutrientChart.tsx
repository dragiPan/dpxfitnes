import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export interface ChartPoint {
  date: string // yyyy-MM-dd
  value: number
}

interface Props {
  data: ChartPoint[]
  target?: number | null
  unit?: string
  targetLabel?: string
}

function fmtDate(d: string) {
  const [, m, day] = d.split('-')
  return `${Number(day)}.${Number(m)}.`
}

/** Monochrome line chart with an optional dashed target reference line. */
export default function NutrientChart({ data, target, unit, targetLabel }: Props) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#e5e5e5" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 10, fontWeight: 700, fill: '#000' }}
            stroke="#000"
          />
          <YAxis
            tick={{ fontSize: 10, fontWeight: 700, fill: '#000' }}
            stroke="#000"
            domain={['auto', 'auto']}
          />
          <Tooltip
            isAnimationActive={false}
            labelFormatter={(l) => fmtDate(String(l))}
            formatter={(v) => [`${v}${unit ? ` ${unit}` : ''}`, '']}
            separator=""
            cursor={{ stroke: '#000', strokeDasharray: '3 3' }}
            contentStyle={{
              border: '2px solid #000',
              borderRadius: 0,
              fontSize: 12,
              fontWeight: 700,
            }}
          />
          {target != null && (
            <ReferenceLine
              y={target}
              stroke="#e11d48"
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: targetLabel ? `${targetLabel}: ${target}` : String(target),
                position: 'insideTopRight',
                fill: '#e11d48',
                fontSize: 10,
                fontWeight: 700,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#000"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: '#000' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
