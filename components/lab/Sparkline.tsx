type SparklineProps = {
  values: number[];
};

export function Sparkline({ values }: SparklineProps) {
  if (values.length < 2) {
    return <span className="text-xs text-blue-slate">Need 2+ Points</span>;
  }
  const width = 120;
  const height = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');
  const rising = values[values.length - 1] >= values[0];
  const stroke = rising ? '#EF8354' : '#4F5D75';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} />
      {values.map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / span) * (height - 6) - 3;
        return <circle key={index} cx={x} cy={y} r="2.5" fill={stroke} />;
      })}
    </svg>
  );
}
