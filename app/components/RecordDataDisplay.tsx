'use client';

interface RecordDataDisplayProps {
  data: Record<string, any>;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return value.trim() || '—';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '—';
    }
    return value.map((item) => formatValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
}

function renderDataItem(key: string, value: any, level: number = 0): JSX.Element | null {
  if (isEmptyValue(value)) {
    return null;
  }

  const indentStyle = level > 0 ? { marginLeft: `${level * 1.5}rem` } : {};
  const formattedKey = formatKey(key);
  const formattedValue = formatValue(value);

  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    const entries = Object.entries(value).filter(([_, v]) => !isEmptyValue(v));
    if (entries.length === 0) {
      return null;
    }

    return (
      <div key={key} className="mb-3" style={indentStyle}>
        <h4 className="font-semibold text-gray-800 mb-2">{formattedKey}</h4>
        <div className="pl-4 border-l-2 border-gray-200 space-y-2">
          {entries.map(([subKey, subValue]) => renderDataItem(subKey, subValue, level + 1))}
        </div>
      </div>
    );
  }

  return (
    <div key={key} className="mb-2" style={indentStyle}>
      <div className="flex flex-col sm:flex-row sm:items-start">
        <span className="font-medium text-gray-700 min-w-[140px] mb-1 sm:mb-0">
          {formattedKey}:
        </span>
        <span className="text-gray-900 flex-1 break-words">{formattedValue}</span>
      </div>
    </div>
  );
}

export default function RecordDataDisplay({ data }: RecordDataDisplayProps) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">No additional data available</div>
    );
  }

  const entries = Object.entries(data).filter(([_, value]) => !isEmptyValue(value));

  if (entries.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">No additional data available</div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => renderDataItem(key, value, 0))}
    </div>
  );
}

