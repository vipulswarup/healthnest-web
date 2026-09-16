export function toPatient(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.owner_id,
    householdId: row.household_id || null,
    householdIds: row.household_ids || undefined,
    firstName: row.first_name,
    middleName: row.middle_name || undefined,
    lastName: row.last_name || undefined,
    title: row.title || undefined,
    suffix: row.suffix || undefined,
    emails: row.emails || [],
    mobileNumbers: row.mobile_numbers || [],
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    abhaNumber: row.abha_number || undefined,
    bloodGroup: row.blood_group || undefined,
    emergencyContacts: row.emergency_contacts || [],
    preferences: row.preferences || {},
    hospitalIdentifiers: row.hospital_identifiers || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
