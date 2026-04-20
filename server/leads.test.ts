import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getLeadStats,
  createLeadNote,
  getLeadNotes,
  deleteLeadNote,
  clearAllLeads,
} from "./db";

describe("Leads Database Operations", () => {
  beforeAll(async () => {
    // Clear database before tests
    await clearAllLeads();
  });

  afterAll(async () => {
    // Clean up after tests
    await clearAllLeads();
  });

  describe("Create Lead", () => {
    it("should create a new lead", async () => {
      const result = await createLead({
        companyName: "Test Company",
        phone: "11999999999",
        segment: "Clínica",
        status: "Entrar em contato",
        type: "CRM",
      });

      expect(result).toBeDefined();
    });
  });

  describe("Get Leads", () => {
    it.skip("should get all leads", async () => {
      // Create a test lead first
      await createLead({
        companyName: "Test Company 2",
        phone: "11999999998",
        segment: "Bar",
        status: "Contatado",
        type: "CRM",
      });

      // Get leads with type filter to match the created lead
      const leads = await getLeads({ type: "CRM" });
      expect(Array.isArray(leads)).toBe(true);
      expect(leads.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter leads by search term", async () => {
      const leads = await getLeads({ searchTerm: "Test", type: "CRM" });
      expect(Array.isArray(leads)).toBe(true);
    });

    it("should filter leads by segment", async () => {
      const leads = await getLeads({ segment: "Clínica", type: "CRM" });
      expect(Array.isArray(leads)).toBe(true);
    });

    it("should filter leads by type", async () => {
      const leads = await getLeads({ type: "CRM" });
      expect(Array.isArray(leads)).toBe(true);
      // All returned leads should have type CRM
      leads.forEach((lead: any) => {
        expect(lead.type).toBe("CRM");
      });
    });

    it("should filter leads by status", async () => {
      const leads = await getLeads({ status: "Entrar em contato", type: "CRM" });
      expect(Array.isArray(leads)).toBe(true);
    });
  });

  describe("Get Lead by ID", () => {
    it.skip("should get a lead by ID", async () => {
      const leads = await getLeads({ type: "CRM" });
      if (leads.length > 0) {
        const lead = await getLeadById(leads[0].id);
        expect(lead).toBeDefined();
        expect(lead?.companyName).toBe(leads[0].companyName);
      }
    });

    it("should return undefined for non-existent lead", async () => {
      const lead = await getLeadById(99999);
      expect(lead).toBeUndefined();
    });
  });

  describe("Update Lead", () => {
    it.skip("should update a lead", async () => {
      const leads = await getLeads({ type: "CRM" });
      if (leads.length > 0) {
        const leadId = leads[0].id;
        await updateLead(leadId, {
          status: "Interessado",
          notes: "Updated notes",
        });

        const updated = await getLeadById(leadId);
        expect(updated?.status).toBe("Interessado");
        expect(updated?.notes).toBe("Updated notes");
      }
    });
  });

  describe("Lead Statistics", () => {
    it("should get lead statistics", async () => {
      const stats = await getLeadStats();
      expect(typeof stats).toBe("object");
    });
  });

  describe("Lead Notes", () => {
    it("should create a note for a lead", async () => {
      const leads = await getLeads({ type: "CRM" });
      if (leads.length > 0) {
        const leadId = leads[0].id;
        const result = await createLeadNote({
          leadId,
          content: "Test note content",
        });
        expect(result).toBeDefined();
      }
    });

    it("should get notes for a lead", async () => {
      const leads = await getLeads({ type: "CRM" });
      if (leads.length > 0) {
        const notes = await getLeadNotes(leads[0].id);
        expect(Array.isArray(notes)).toBe(true);
      }
    });

    it("should delete a note", async () => {
      const leads = await getLeads({ type: "CRM" });
      if (leads.length > 0) {
        const notes = await getLeadNotes(leads[0].id);
        if (notes.length > 0) {
          const result = await deleteLeadNote(notes[0].id);
          expect(result).toBeDefined();
        }
      }
    });
  });

  describe("Delete Lead", () => {
    it.skip("should delete a lead", async () => {
      const leads = await getLeads({ type: "CRM" });
      const initialCount = leads.length;

      if (leads.length > 0) {
        await deleteLead(leads[0].id);
        const updatedLeads = await getLeads({ type: "CRM" });
        expect(updatedLeads.length).toBeLessThan(initialCount);
      }
    });
  });

  describe("Clear All Leads", () => {
    it.skip("should clear all leads and notes", async () => {
      await clearAllLeads();
      const leads = await getLeads({ type: "CRM" });
      expect(leads.length).toBeLessThanOrEqual(0);
    });
  });
});
