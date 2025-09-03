import type { AxiosInstance } from "axios";
import axios from "axios";

export const FHIR_BASE_URL = "https://hapi.fhir.org/baseR4";

export interface Practitioner {
  resourceType: "Practitioner";
  id?: string;
  active?: boolean;
  name?: Array<{
    family?: string;
    given?: string[];
    prefix?: string[];
  }>;
  meta?: {
    lastUpdated?: string;
  };
}

export interface Patient {
  resourceType: "Patient";
  id?: string;
  active?: boolean;
  name?: Array<{
    family?: string;
    given?: string[];
  }>;
  generalPractitioner?: Array<{
    reference: string; // e.g., Practitioner/{id}
  }>;
  meta?: {
    lastUpdated?: string;
  };
}

export interface DocumentReference {
  resourceType: "DocumentReference";
  id?: string;
  status?: "current" | "superseded" | "entered-in-error";
  type?: {
    text?: string;
  };
  subject?: { reference: string }; // Patient/{id}
  author?: Array<{ reference: string }>; // Practitioner/{id}
  description?: string; // title
  content?: Array<{
    attachment: {
      contentType?: string;
      data?: string; // base64-encoded
      title?: string;
    };
  }>;
  meta?: {
    lastUpdated?: string;
  };
}

class FhirClient {
  private http: AxiosInstance;
  constructor(baseURL: string = FHIR_BASE_URL) {
    this.http = axios.create({
      baseURL,
      headers: {
        Accept: "application/fhir+json",
        "Content-Type": "application/fhir+json",
      },
    });
  }

  // Practitioner
  async searchPractitioners(name?: string) {
    try {
      const params: Record<string, string> = {
        _sort: "-_lastUpdated", // Sort by last updated, newest first
      };
      if (name) params.name = name;

      const res = await this.http.get("/Practitioner", { params });
      if (!res.data?.entry) {
        return { entry: [] };
      }
      return res.data;
    } catch (error) {
      console.error("Failed to search practitioners:", error);
      throw new Error("Failed to load practitioners. Please try again.");
    }
  }

  async createPractitioner(prac: Practitioner) {
    try {
      const res = await this.http.post("/Practitioner", prac);
      if (!res.data?.id) {
        throw new Error("Invalid response from server");
      }
      return res.data as Practitioner;
    } catch (error) {
      console.error("Failed to create practitioner:", error);
      throw new Error("Failed to create practitioner. Please try again.");
    }
  }

  // Patient
  async searchPatients(
    params: { name?: string; practitionerId?: string } = {}
  ) {
    try {
      const query: Record<string, string> = {
        _sort: "-_lastUpdated", // Sort by last updated, newest first
      };
      if (params.name) query.name = params.name;
      if (params.practitionerId)
        query["general-practitioner"] = `Practitioner/${params.practitionerId}`;
      const res = await this.http.get("/Patient", { params: query });
      if (!res.data?.entry) {
        return { entry: [] };
      }
      return res.data;
    } catch (error) {
      console.error("Failed to search patients:", error);
      throw new Error("Failed to load patients. Please try again.");
    }
  }

  async createPatient(patient: Patient) {
    try {
      const res = await this.http.post("/Patient", patient);
      if (!res.data?.id) {
        throw new Error("Invalid response from server");
      }
      return res.data as Patient;
    } catch (error) {
      console.error("Failed to create patient:", error);
      throw new Error("Failed to create patient. Please try again.");
    }
  }

  // Notes via DocumentReference
  async searchNotes(patientId: string) {
    try {
      const res = await this.http.get("/DocumentReference", {
        params: {
          subject: `Patient/${patientId}`,
          _sort: "-_lastUpdated", // Sort by last updated, newest first
        },
      });
      if (!res.data?.entry) {
        return { entry: [] };
      }
      return res.data;
    } catch (error) {
      console.error("Failed to search notes:", error);
      throw new Error("Failed to load notes. Please try again.");
    }
  }

  async createNote(note: DocumentReference) {
    try {
      const res = await this.http.post("/DocumentReference", note);
      if (!res.data?.id) {
        throw new Error("Invalid response from server");
      }
      return res.data as DocumentReference;
    } catch (error) {
      console.error("Failed to create note:", error);
      throw new Error("Failed to create note. Please try again.");
    }
  }

  async updateNote(id: string, note: Partial<DocumentReference>) {
    try {
      const res = await this.http.put(`/DocumentReference/${id}`, {
        resourceType: "DocumentReference",
        id,
        ...note,
      });
      if (!res.data?.id) {
        throw new Error("Invalid response from server");
      }
      return res.data as DocumentReference;
    } catch (error) {
      console.error("Failed to update note:", error);
      throw new Error("Failed to update note. Please try again.");
    }
  }
}

export const fhirClient = new FhirClient();
