# Actimi – FHIR Notes

A minimal React app wired to the public HAPI FHIR server to manage Practitioners, Patients and clinical Notes (DocumentReference).

## Features

- Select/search/add Practitioner
- Select/search/add Patient assigned to the active Practitioner
- Create/edit clinical notes linked to active Practitioner + Patient
- Notes are stored as DocumentReference with text/plain attachment
- Export note to PDF

## Getting started

1. Install dependencies

```bash
npm install
```

2. Start dev server

```bash
npm run dev
```

Open the printed URL (e.g. http://localhost:5173/).

## Tech

- React + Vite + TypeScript
- React Router
- Axios
- jsPDF
- FHIR server: https://hapi.fhir.org/baseR4

## Notes

- Public HAPI is shared; resources are visible to others and may be cleaned periodically.
- Practitioner/Patient IDs are stored locally to keep context between reloads.
