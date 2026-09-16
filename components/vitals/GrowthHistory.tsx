import { ageAtDate, bmi, formatCalendarDate, measurementLine, type GrowthMeasurement } from '@/lib/vitals/growth';

export function GrowthHistory({
  measurements,
  dateOfBirth,
  onDelete,
}: {
  measurements: GrowthMeasurement[];
  dateOfBirth?: string | null;
  onDelete?: (id: string) => void;
}) {
  if (measurements.length === 0) {
    return <p className="text-base text-gray-600">No height or weight recorded yet.</p>;
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {measurements.map((measurement) => {
        const age = dateOfBirth ? ageAtDate(dateOfBirth, new Date(measurement.measuredAt)) : null;
        const bmiValue = bmi(measurement.heightCm, measurement.weightKg);
        return (
          <li key={measurement.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-base font-medium text-gray-900">{formatCalendarDate(measurement.calendarDate)}</p>
              <p className="mt-1 text-sm text-gray-700">
                {[
                  measurement.heightCm !== null ? `${measurement.heightCm} cm` : null,
                  measurement.weightKg !== null ? `${measurement.weightKg} kg` : null,
                  measurement.headCircumCm !== null ? `head ${measurement.headCircumCm} cm` : null,
                ].filter(Boolean).join(' · ') || 'Recorded'}
              </p>
              {(age || bmiValue) && (
                <p className="mt-1 text-sm text-gray-500">
                  {[age ? `Age ${age}` : null, bmiValue ? `BMI ${bmiValue}` : null].filter(Boolean).join(' · ')}
                </p>
              )}
              {measurement.notes ? <p className="mt-1 text-sm text-gray-600">{measurement.notes}</p> : null}
            </div>
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(measurement.id)}
                className="shrink-0 text-sm text-red-700 hover:underline"
              >
                Remove
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function growthSummaryLine(measurement: GrowthMeasurement, dateOfBirth?: string | null) {
  return measurementLine(measurement, dateOfBirth);
}
