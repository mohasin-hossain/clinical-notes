import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Heart,
  Loader2,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="p-0 h-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            Patients
          </h1>
          {practitionerName && (
            <p className="text-muted-foreground">
              Managing patients for{" "}
              <span className="font-medium">{practitionerName}</span>
            </p>
          )}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Add New Patient Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Patient
          </CardTitle>
          <CardDescription>
            Create a new patient profile to start managing their clinical notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
            <Input
              placeholder="Given name"
              value={form.given}
              onChange={(e) => setForm({ ...form, given: e.target.value })}
              disabled={!activePractitionerId}
              className="flex-1"
            />
            <Input
              placeholder="Family name"
              value={form.family}
              onChange={(e) => setForm({ ...form, family: e.target.value })}
              disabled={!activePractitionerId}
              className="flex-1"
            />
            <Button
              onClick={createPatient}
              disabled={!canCreate}
              className="md:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Patient
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading patients...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && patients.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="rounded-full bg-muted p-3">
                <Heart className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No patients found</h3>
                <p className="text-muted-foreground">
                  {query
                    ? "Try adjusting your search criteria."
                    : "Get started by adding your first patient."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patients Grid */}
      {!loading && patients.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => {
            const id = p.id!;
            const label = p.name?.[0]
              ? `${p.name?.[0].given?.join(" ") ?? ""} ${
                  p.name?.[0].family ?? ""
                }`.trim()
              : id;
            const active = id === activePatientId;
            const initials = label
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Card
                key={id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  active ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => selectPatient(id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-lg">{label}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={active ? "default" : "secondary"}>
                          {active ? "Selected" : "Available"}
                        </Badge>
                        {p.active && (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {notesMap[id] && (
                    <div className="space-y-2">
                      <Separator />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>Latest Note</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notesMap[id]}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
