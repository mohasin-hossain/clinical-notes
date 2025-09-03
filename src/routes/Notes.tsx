import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Download,
  Edit,
  FileText,
  Loader2,
  Plus,
  Save,
  Stethoscope,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/patients")}
              className="p-0 h-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Patients
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Clinical Notes
          </h1>
          {patientName && practitionerName && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>
                  Patient: <span className="font-medium">{patientName}</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Stethoscope className="h-4 w-4" />
                <span>
                  Practitioner:{" "}
                  <span className="font-medium">{practitionerName}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Note Editor */}
        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingId ? (
                  <>
                    <Edit className="h-5 w-5" />
                    Edit Note
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    New Note
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {editingId
                  ? "Update the clinical note below."
                  : "Create a new clinical note for this patient."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Note title (optional)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={!activePatientId}
              />
              <Textarea
                placeholder="Write clinical note…"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                rows={12}
                disabled={!activePatientId}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  onClick={saveNote}
                  disabled={!canCreate}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editingId ? "Update Note" : "Save Note"}
                </Button>
                {editingId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ title: "", text: "" });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Previous Notes</h2>
            <Badge variant="secondary">{notes.length}</Badge>
          </div>

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading notes...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!loading && !error && notes.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="rounded-full bg-muted p-3">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      No clinical notes yet
                    </h3>
                    <p className="text-muted-foreground">
                      Start by creating your first clinical note for this
                      patient.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes List */}
          {!loading && notes.length > 0 && (
            <div className="space-y-4">
              {notes.map((n) => (
                <Card key={n.id} className="transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {n.title || "Untitled Note"}
                        </CardTitle>
                        {n.meta?.lastUpdated && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(
                                n.meta.lastUpdated
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(n.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportPdf(n)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Separator />
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                        {n.text || "No content available."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
