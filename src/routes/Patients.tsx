import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DocumentReference, Patient, Practitioner } from "../fhir";
import { fhirClient } from "../fhir";
import { useAppState } from "../state";

export default function Patients() {
  const navigate = useNavigate();
  const { activePractitionerId, activePatientId, setActivePatientId } =
    useAppState();
  const [bundle, setBundle] = useState<any | null>(null);
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const patients: Patient[] = useMemo(() => {
    const entries = bundle?.entry ?? [];
    return entries
      .map((e: any) => e.resource)
      .filter((r: any) => r.resourceType === "Patient");
  }, [bundle]);

  // Load practitioner details
  useEffect(() => {
    if (!activePractitionerId) {
      navigate("/");
      return;
    }

    async function loadPractitioner() {
      try {
        const res = await fetch(
          `${fhirClient.baseURL}/Practitioner/${activePractitionerId}`
        );
        const data = await res.json();
        setPractitioner(data);
      } catch (e) {
        console.error("Failed to load practitioner:", e);
      }
    }
    loadPractitioner();
  }, [activePractitionerId, navigate]);

  // Load patients and their notes
  useEffect(() => {
    if (!activePractitionerId) return;
    setLoading(true);
    setError(null);
    fhirClient
      .searchPatients({
        name: query || undefined,
        practitionerId: activePractitionerId,
      })
      .then(async (data) => {
        setBundle(data);
        const patientIds = (data?.entry || [])
          .map((e: any) => e.resource?.id)
          .filter(Boolean);
        const notePromises = patientIds.map(async (pid: string) => {
          try {
            const notesBundle = await fhirClient.searchNotes(pid);
            const latestNote = notesBundle?.entry?.[0]
              ?.resource as DocumentReference;
            if (latestNote?.content?.[0]?.attachment?.data) {
              const text = atob(latestNote.content[0].attachment.data);
              return [pid, text.slice(0, 80) + (text.length > 80 ? "..." : "")];
            }
          } catch {}
          return [pid, ""];
        });
        const notes = await Promise.all(notePromises);
        setNotesMap(Object.fromEntries(notes.filter(([, text]) => text)));
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [activePractitionerId, query]);

  const [form, setForm] = useState({ given: "", family: "" });
  const canCreate =
    !!activePractitionerId &&
    (form.given.trim().length > 0 || form.family.trim().length > 0);

  async function createPatient() {
    if (!activePractitionerId) {
      setError("Please select a practitioner first");
      return;
    }
    try {
      setError(null);
      const body: Patient = {
        resourceType: "Patient",
        active: true,
        name: [
          {
            given: form.given ? [form.given] : undefined,
            family: form.family || undefined,
          },
        ],
        generalPractitioner: [
          { reference: `Practitioner/${activePractitionerId}` },
        ],
      };
      const created = await fhirClient.createPatient(body);
      setActivePatientId(created.id);
      setForm({ given: "", family: "" });
      navigate("/notes");
    } catch (e) {
      setError(String(e));
    }
  }

  function selectPatient(id: string) {
    setActivePatientId(id);
    navigate("/notes");
  }

  const practitionerName = practitioner?.name?.[0]
    ? `${practitioner.name[0].given?.join(" ") ?? ""} ${
        practitioner.name[0].family ?? ""
      }`.trim()
    : null;

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2>Select Patient</h2>
          {practitionerName && (
            <div className="subtitle">Practitioner: {practitionerName}</div>
          )}
        </div>
        <div className="search-box">
          <input
            placeholder="Search patients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="add-form">
        <h3>Add New Patient</h3>
        <div className="form-row">
          <input
            placeholder="Given name"
            value={form.given}
            onChange={(e) => setForm({ ...form, given: e.target.value })}
            disabled={!activePractitionerId}
          />
          <input
            placeholder="Family name"
            value={form.family}
            onChange={(e) => setForm({ ...form, family: e.target.value })}
            disabled={!activePractitionerId}
          />
          <button
            className="primary"
            disabled={!canCreate}
            onClick={createPatient}
          >
            Create
          </button>
        </div>
      </div>

      {loading && <div className="loading">Loading patients...</div>}
      {error && <div className="error">{error}</div>}

      <div className="content">
        {!loading && !error && patients.length === 0 && (
          <div className="empty-state">No patients found.</div>
        )}

        <div className="grid">
          {patients.map((p) => {
            const id = p.id!;
            const label = p.name?.[0]
              ? `${p.name?.[0].given?.join(" ") ?? ""} ${
                  p.name?.[0].family ?? ""
                }`.trim()
              : id;
            const active = id === activePatientId;
            return (
              <div
                key={id}
                className={`card clickable ${active ? "active" : ""}`}
                onClick={() => selectPatient(id)}
              >
                <div className="avatar">{(label[0] || "P").toUpperCase()}</div>
                <div className="name">{label}</div>
                {notesMap[id] && (
                  <div className="note-preview">
                    <div className="note-label">Latest Note:</div>
                    {notesMap[id]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
