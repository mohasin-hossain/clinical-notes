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
import {
  AlertCircle,
  Calendar,
  Loader2,
  Plus,
  Search,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Practitioner } from "../fhir";
import { fhirClient } from "../fhir";
import { useAppState } from "../state";

export default function Practitioners() {
  const navigate = useNavigate();
  const { activePractitionerId, setActivePractitionerId } = useAppState();
  const [bundle, setBundle] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const practitioners: Practitioner[] = useMemo(() => {
    const entries = bundle?.entry ?? [];
    return entries
      .map((e: any) => e.resource)
      .filter((r: any) => r.resourceType === "Practitioner");
  }, [bundle]);

  // Load practitioners
  async function loadPractitioners() {
    setLoading(true);
    setError(null);
    try {
      const data = await fhirClient.searchPractitioners(query || undefined);
      setBundle(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  // Load on mount and when search changes
  useEffect(() => {
    loadPractitioners();
  }, [query]);

  const [form, setForm] = useState({ given: "", family: "" });
  const canCreate =
    form.given.trim().length > 0 || form.family.trim().length > 0;

  async function createPractitioner() {
    try {
      setError(null);
      const body: Practitioner = {
        resourceType: "Practitioner",
        active: true,
        name: [
          {
            given: form.given ? [form.given] : undefined,
            family: form.family || undefined,
          },
        ],
      };
      const created = await fhirClient.createPractitioner(body);
      setActivePractitionerId(created.id);
      setForm({ given: "", family: "" });
      // Refresh list to show new practitioner
      await loadPractitioners();
      navigate("/patients");
    } catch (e) {
      setError(String(e));
    }
  }

  function selectPractitioner(id: string) {
    setActivePractitionerId(id);
    navigate("/patients");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            Practitioners
          </h1>
          <p className="text-muted-foreground">
            Select a practitioner to manage their patients and clinical notes.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search practitioners..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Add New Practitioner Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Practitioner
          </CardTitle>
          <CardDescription>
            Create a new practitioner profile to start managing patients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
            <Input
              placeholder="Given name"
              value={form.given}
              onChange={(e) => setForm({ ...form, given: e.target.value })}
              className="flex-1"
            />
            <Input
              placeholder="Family name"
              value={form.family}
              onChange={(e) => setForm({ ...form, family: e.target.value })}
              className="flex-1"
            />
            <Button
              onClick={createPractitioner}
              disabled={!canCreate}
              className="md:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Practitioner
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
              <span>Loading practitioners...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && practitioners.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="rounded-full bg-muted p-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  No practitioners found
                </h3>
                <p className="text-muted-foreground">
                  {query
                    ? "Try adjusting your search criteria."
                    : "Get started by adding your first practitioner."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practitioners Grid */}
      {!loading && practitioners.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {practitioners.map((p) => {
            const id = p.id!;
            const label = p.name?.[0]
              ? `${p.name?.[0].given?.join(" ") ?? ""} ${
                  p.name?.[0].family ?? ""
                }`.trim()
              : id;
            const active = id === activePractitionerId;
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
                onClick={() => selectPractitioner(id)}
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
                  {p.meta?.lastUpdated && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Added{" "}
                        {new Date(p.meta.lastUpdated).toLocaleDateString()}
                      </span>
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
