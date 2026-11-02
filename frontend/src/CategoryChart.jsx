import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function CategoryChart({ data }) {
  if (data.length === 0) return null;

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total" name="Spent" fill="#4f46e5" />
          <Bar dataKey="budget" name="Budget" fill="#9ca3af" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}