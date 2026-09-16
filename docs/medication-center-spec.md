# Medication Center: international medication portability

## Purpose

Build a patient medication record that can be safely understood by clinicians in
India, the United States, and the United Kingdom. The feature must preserve what
the patient originally entered while also presenting a confirmed, portable
active-ingredient composition.

This is a health-record feature, not a prescribing or clinical decision-support
tool. It must never silently turn an uncertain brand-name match into a confirmed
clinical fact.

## Patient medication record

For each medication, retain the following separately:

- **Original entry:** the brand name exactly as the user entered it and the
  country where it was obtained.
- **Confirmed composition:** one or more active ingredients (salts), with a
  strength, unit, and formulation for every ingredient.
- **Canonical terminology:** International Nonproprietary Name (INN) for every
  ingredient. Local aliases can be displayed when useful; for example,
  `paracetamol` can also be shown as `acetaminophen` in US-facing views.
- **Prescription details:** the original dosage instructions as free text,
  preserved exactly as entered. A structured schedule is supplementary and must
  not replace or reinterpret those instructions.
- **Clinical context:** optional indication/reason for use, prescribed-by,
  start date, end date, active status, and tags.
- **History:** discontinued medicines belong in a separate past-medications
  section, with optional stop date and reason for stopping.

Combination products are first-class records: a user must be able to confirm
multiple active ingredients rather than being limited to one salt.

## Confirmation and uncertainty

1. A user enters a brand name and the country of purchase.
2. SanoVault searches the shared catalogue and offers matching compositions.
3. The user chooses a composition to confirm, or saves the medication as
   **unconfirmed** with an explicit warning.
4. If a candidate is ambiguous, the product must not be silently chosen.
5. Users may enter an unknown brand with typed brand, country, ingredients,
   strengths, and formulation. A packaging photo is deliberately out of scope
   for this web release to avoid unnecessary friction.

The original entry is immutable. Confirmations, catalogue-source versions, and
changes must be retained as an auditable history so a future clinician can trace
the mapping that was used.

## Shared medication catalogue

The medicine catalogue is shared by all users and households. Patient records,
their medication histories, and contributor identity remain private to their
households.

Only de-identified catalogue data may be shared:

- Brand/product names and country
- Ingredient composition, strengths, units, and formulation
- Canonical INN names and localized aliases
- Provenance/source references and source versions
- Automated-review results and version history

Do not store contributor or household identifiers in the shared catalogue.

### Initial country coverage

Support these markets first:

- **India:** use the proposed India Drug Bank dataset only as candidate data;
  validate its licence, provenance, and refresh process before treating any
  mapping as trusted.
- **United States:** use RxNorm for normalized ingredients, clinical drug names,
  strengths, dose forms, and brand/generic links. Use DailyMed for current
  FDA-submitted product-label enrichment.
- **United Kingdom:** use the NHS Dictionary of Medicines and Devices (dm+d)
  for coded product, ingredient, strength, and formulation data.

The catalogue must retain the source and version that supported every mapping.
Do not use a live web search as the primary clinical-data source. It may be used
only as a fallback to propose an **unconfirmed** match with evidence for the user
to review; it must never populate a confirmed patient record automatically.

## Automated review and safety controls

- Reconcile the shared catalogue against reference sources **weekly**.
- New typed mappings that agree with reference data can publish automatically;
  there is no human-approval workflow in the initial release.
- When review finds a mismatch, mark the mapping as unsafe for new use.
- Block new users from selecting or confirming a flagged mapping until it passes
  review again.
- Keep existing patient records intact, but show a prominent warning whenever a
  patient views or selects that medication.
- Do not show routine catalogue verification state or last-verified dates in
  doctor-facing reports. Warnings for problematic records still apply.

## International doctor-facing list

When viewing or generating a medication list, the user chooses the destination
market: India, USA, or UK.

The list always includes the confirmed generic composition. It may additionally
show locally familiar brands for the destination market, but **only** where the
candidate product is an exact match for all active ingredients, strengths, and
formulation. If no exact equivalent exists, show only the generic composition.

Reports should include active medications and, separately, past medications when
available. They must retain the original brand/purchase-country context without
overstating equivalence to another market's product.

## Implementation implications

The existing `medications` table and CRUD endpoints provide a starting point but
do not model ingredients, source provenance, country-specific products, review
state, dose events, or reminders sufficiently. The implementation will need:

- A normalized, versioned medication catalogue with country product mappings.
- A per-medication ingredient/composition model supporting fixed-dose
  combinations.
- Immutable patient-entry and confirmation history.
- A weekly ingestion and reconciliation job.
- A medication-list UI, dose tracker, and doctor-facing export/view with a
  destination-country selector.
- Appropriate authorization and audit coverage for medication changes.

### Deployment configuration

The weekly reconciliation endpoint is scheduled by `vercel.json` for Monday at
03:00 UTC. Before enabling it in a production project, configure:

- `CRON_SECRET` — protects the scheduled endpoint.
- `MEDICATION_CATALOGUE_FEED_URL` — an internally managed, licensed,
  normalized JSON export of the approved source data.
- `MEDICATION_CATALOGUE_FEED_TOKEN` — optional bearer token for that export.

The source-feed contract includes a source name/version, country, brand,
formulation, stable external identifier, optional source reference, ranked
display priority, and ordered ingredients. The system uses display priority to
show up to three of the most appropriate exact-match local brands in a
doctor-facing list.

## Deferred work

- Packaging/prescription-photo capture for unknown brand submissions, better
  suited to a future mobile flow.
- Push, email, and operating-system medication reminders. Establish reliable
  in-app medication and dose tracking first.
- Additional markets beyond India, USA, and UK.
