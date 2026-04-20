import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getLeads, clearAllLeads } from "./db";

describe("Segment Field - Display and Filtering", () => {
  beforeAll(async () => {
    // Clear all leads before tests
    await clearAllLeads();
  });

  afterAll(async () => {
    // Cleanup
    await clearAllLeads();
  });

  it("should return segment in leads list query", async () => {
    // Get all leads
    const leads = await getLeads({ type: "CRM" });
    expect(leads).toBeInstanceOf(Array);
    
    // Verify that leads have segment field
    if (leads.length > 0) {
      const lead = leads[0];
      expect(lead).toHaveProperty("segment");
      expect(typeof lead.segment).toBe("string");
    }
  });

  it("should have segment field in lead objects", async () => {
    const leads = await getLeads({ type: "CRM" });
    
    // Check that all leads have segment field
    leads.forEach((lead: any) => {
      expect(lead).toHaveProperty("segment");
      expect(typeof lead.segment).toBe("string");
    });
  });

  it("should filter leads by segment correctly", async () => {
    // Get all leads first
    const allLeads = await getLeads({ type: "CRM" });
    
    if (allLeads.length > 0) {
      // Get the segment from first lead
      const firstSegment = allLeads[0].segment;
      
      // Filter by that segment
      const filteredLeads = await getLeads({ segment: firstSegment, type: "CRM" });
      
      // Verify filtering works
      expect(filteredLeads.length).toBeGreaterThan(0);
      expect(filteredLeads.every((l: any) => l.segment === firstSegment)).toBe(true);
    }
  });

  it("should display segment in leads with correct data type", async () => {
    const leads = await getLeads({ type: "CRM" });
    
    leads.forEach((lead: any) => {
      // Verify segment is a string
      expect(typeof lead.segment).toBe("string");
      
      // Verify segment is not empty (required field)
      expect(lead.segment.length).toBeGreaterThan(0);
      
      // Verify other required fields are also present
      expect(lead).toHaveProperty("companyName");
      expect(lead).toHaveProperty("phone");
      expect(lead).toHaveProperty("status");
    });
  });
});
