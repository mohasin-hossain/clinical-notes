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
    <div className="container">
      <div className="header">
        <h2>Select Practitioner</h2>
        <div className="search-box">
          <input
            placeholder="Search practitioners..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="add-form">
        <h3>Add New Practitioner</h3>
        <div className="form-row">
          <input
            placeholder="Given name"
            value={form.given}
            onChange={(e) => setForm({ ...form, given: e.target.value })}
          />
          <input
            placeholder="Family name"
            value={form.family}
            onChange={(e) => setForm({ ...form, family: e.target.value })}
          />
          <button
            className="primary"
            disabled={!canCreate}
            onClick={createPractitioner}
          >
            Create
          </button>
        </div>
      </div>

      {loading && <div className="loading">Loading practitioners...</div>}
      {error && <div className="error">{error}</div>}

      <div className="content">
        {!loading && !error && practitioners.length === 0 && (
          <div className="empty-state">No practitioners found.</div>
        )}

        <div className="grid">
          {practitioners.map((p) => {
            const id = p.id!;
            const label = p.name?.[0]
              ? `${p.name?.[0].given?.join(" ") ?? ""} ${
                  p.name?.[0].family ?? ""
                }`.trim()
              : id;
            const active = id === activePractitionerId;
            return (
              <div
                key={id}
                className={`card clickable ${active ? "active" : ""}`}
                onClick={() => selectPractitioner(id)}
              >
                <div className="avatar">{(label[0] || "P").toUpperCase()}</div>
                <div className="name">{label}</div>
                {p.meta?.lastUpdated && (
                  <div className="timestamp">
                    Added {new Date(p.meta.lastUpdated).toLocaleDateString()}
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
