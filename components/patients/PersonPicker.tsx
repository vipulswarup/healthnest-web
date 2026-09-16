'use client';

type Person = { id: string; firstName: string; lastName?: string };

type PersonPickerProps = {
  people: Person[];
  selectedId?: string;
  lastUsedId?: string | null;
  onSelect: (id: string) => void;
};

function displayName(person: Person) {
  return `${person.firstName} ${person.lastName || ''}`.trim();
}

export default function PersonPicker({ people, selectedId, lastUsedId, onSelect }: PersonPickerProps) {
  if (people.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {people.map((person) => {
        const selected = person.id === selectedId;
        const lastUsed = person.id === lastUsedId;
        return (
          <li key={person.id}>
            <button
              type="button"
              onClick={() => onSelect(person.id)}
              className={`flex min-h-16 w-full items-center justify-between rounded-xl border px-4 py-4 text-left text-lg font-semibold transition ${
                selected
                  ? 'border-coral bg-blue-50 text-[#D96C3D]'
                  : 'border-gray-200 bg-white text-gray-950 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span>{displayName(person)}</span>
              {lastUsed && !selected && (
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Last Used</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
