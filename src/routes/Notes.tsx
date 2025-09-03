import jsPDF from "jspdf";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DocumentReference, Patient, Practitioner } from "../fhir";
import { fhirClient } from "../fhir";
import { useAppState } from "../state";

type NoteItem = {
  id: string;
  title?: string;
  text?: string;
  meta?: {
    lastUpdated?: string;
  };
};

function decodeAttachmentToText(note: DocumentReference): NoteItem {
  const id = note.id!;
  const attachment = note.content?.[0]?.attachment;
  const data = attachment?.data ? atob(attachment.data) : undefined;
  return {
    id,
    title: note.description,
    text: data,
    meta: note.meta,
  };
}

export default function Notes() {
  const navigate = useNavigate();
  const { activePractitionerId, activePatientId } = useAppState();
  const [bundle, setBundle] = useState<any | null>(null);
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notes: NoteItem[] = useMemo(() => {
    const entries = bundle?.entry ?? [];
    return entries
      .map((e: any) => e.resource)
      .filter((r: any) => r.resourceType === "DocumentReference")
      .map((r: DocumentReference) => decodeAttachmentToText(r));
  }, [bundle]);

  // Load practitioner and patient details
  useEffect(() => {
    if (!activePractitionerId || !activePatientId) {
      navigate("/patients");
      return;
    }

    async function loadDetails() {
      try {
        const [pracRes, patRes] = await Promise.all([
          fetch(`${fhirClient.baseURL}/Practitioner/${activePractitionerId}`),
          fetch(`${fhirClient.baseURL}/Patient/${activePatientId}`),
        ]);
        const [pracData, patData] = await Promise.all([
          pracRes.json(),
          patRes.json(),
        ]);
        setPractitioner(pracData);
        setPatient(patData);
      } catch (e) {
        console.error("Failed to load details:", e);
      }
    }
    loadDetails();
  }, [activePractitionerId, activePatientId, navigate]);

  // Load notes
  useEffect(() => {
    if (!activePatientId) return;
    setLoading(true);
    setError(null);
    fhirClient
      .searchNotes(activePatientId)
      .then(setBundle)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [activePatientId]);

  const [form, setForm] = useState({ title: "", text: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const canCreate =
    !!activePractitionerId &&
    !!activePatientId &&
    (form.title.trim() || form.text.trim());

  async function saveNote() {
    if (!activePractitionerId) {
      setError("Please select a practitioner first");
      return;
    }
    if (!activePatientId) {
      setError("Please select a patient first");
      return;
    }

    try {
      setError(null);
      const baseNote: DocumentReference = {
        resourceType: "DocumentReference",
        status: "current",
        type: { text: "Clinical Note" },
        subject: { reference: `Patient/${activePatientId}` },
        author: [{ reference: `Practitioner/${activePractitionerId}` }],
        description: form.title || "Untitled Note",
        content: [
          {
            attachment: {
              contentType: "text/plain",
              title: form.title || "note.txt",
              data: btoa(form.text),
            },
          },
        ],
      };

      if (editingId) {
        await fhirClient.updateNote(editingId, baseNote);
        setEditingId(null);
      } else {
        await fhirClient.createNote(baseNote);
      }

      setForm({ title: "", text: "" });
      // Refresh notes list
      const notesData = await fhirClient.searchNotes(activePatientId);
      setBundle(notesData);
    } catch (e) {
      setError(String(e));
    }
  }

  function startEdit(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    setEditingId(id);
    setForm({ title: note.title || "", text: note.text || "" });
  }

  function exportPdf(n: NoteItem) {
    try {
      const doc = new jsPDF();

      // Add header with patient and practitioner info
      doc.setFontSize(14);
      doc.text("Clinical Note", 10, 15);

      doc.setFontSize(10);
      if (patient?.name?.[0]) {
        const patientName = `${patient.name[0].given?.join(" ") ?? ""} ${
          patient.name[0].family ?? ""
        }`.trim();
        doc.text(`Patient: ${patientName}`, 10, 25);
      }

      if (practitioner?.name?.[0]) {
        const practitionerName = `${
          practitioner.name[0].given?.join(" ") ?? ""
        } ${practitioner.name[0].family ?? ""}`.trim();
        doc.text(`Practitioner: ${practitionerName}`, 10, 32);
      }

      doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 39);

      // Add title and content
      doc.setFontSize(12);
      doc.text(n.title || "Untitled Note", 10, 50);

      doc.setFontSize(10);
      const text = n.text || "";
      const lines = doc.splitTextToSize(text, 180);
      doc.text(lines, 10, 60);

      doc.save(`${(n.title || "clinical-note").replace(/\s+/g, "-")}.pdf`);
    } catch (e) {
      setError("Failed to generate PDF. Please try again.");
    }
  }

  const practitionerName = practitioner?.name?.[0]
    ? `${practitioner.name[0].given?.join(" ") ?? ""} ${
        practitioner.name[0].family ?? ""
      }`.trim()
    : "";

  const patientName = patient?.name?.[0]
    ? `${patient.name[0].given?.join(" ") ?? ""} ${
        patient.name[0].family ?? ""
      }`.trim()
    : "";

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2>Clinical Notes</h2>
          {patientName && practitionerName && (
            <div className="subtitle">
              Patient: {patientName} • Practitioner: {practitionerName}
            </div>
          )}
        </div>
      </div>

      <div className="notes-section">
        <div className="notes-editor">
          <div className="add-form">
            <h3>{editingId ? "Edit Note" : "New Note"}</h3>
            <div className="note-form">
              <input
                placeholder="Note title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={!activePatientId}
              />
              <textarea
                placeholder="Write clinical note…"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                rows={12}
                disabled={!activePatientId}
              />
              <div className="form-actions">
                <button
                  className="primary"
                  disabled={!canCreate}
                  onClick={saveNote}
                >
                  {editingId ? "Update Note" : "Save Note"}
                </button>
                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setForm({ title: "", text: "" });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="notes-list">
          <h3>Previous Notes</h3>
          {loading && <div className="loading">Loading notes...</div>}
          {error && <div className="error">{error}</div>}
          {!loading && !error && notes.length === 0 && (
            <div className="empty-state">No clinical notes yet.</div>
          )}
          {notes.map((n) => (
            <div key={n.id} className="note-card">
              <div className="note-header">
                <h4>{n.title || "Untitled"}</h4>
                <div className="note-actions">
                  <button onClick={() => startEdit(n.id)}>Edit</button>
                  <button onClick={() => exportPdf(n)}>PDF</button>
                </div>
              </div>
              <div className="note-content">{n.text || ""}</div>
              <div className="note-meta">
                {n.meta?.lastUpdated && (
                  <span>
                    Last updated:{" "}
                    {new Date(n.meta.lastUpdated).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="nav">
        <Link to="/patients">← Back to Patients</Link>
      </div>
    </div>
  );
}
