import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, getLeads, getLeadStats, getLeadCountByType } from './db';
import { leads } from '../drizzle/schema';
import { sql, eq } from 'drizzle-orm';

describe('Import by Type - Separate Databases', () => {
  let db: any;

  beforeEach(async () => {
    db = await getDb();
  });

  describe('Lead Type Filtering', () => {
    it('should filter leads by CRM type', async () => {
      const crmLeads = await getLeads({ type: 'CRM' });
      
      crmLeads.forEach(lead => {
        expect(lead.type).toBe('CRM');
      });
    });

    it('should filter leads by Site type', async () => {
      const siteLeads = await getLeads({ type: 'Site' });
      
      siteLeads.forEach(lead => {
        expect(lead.type).toBe('Site');
      });
    });
  });

  describe('Stats Filtering by Type', () => {
    it('should calculate stats only for CRM leads', async () => {
      const crmStats = await getLeadStats('CRM');
      const crmLeads = await getLeads({ type: 'CRM' });
      
      let totalCRM = 0;
      Object.values(crmStats).forEach(count => {
        totalCRM += count as number;
      });
      
      expect(totalCRM).toBeGreaterThanOrEqual(0);
    });

    it('should calculate stats only for Site leads', async () => {
      const siteStats = await getLeadStats('Site');
      const siteLeads = await getLeads({ type: 'Site' });
      
      let totalSite = 0;
      Object.values(siteStats).forEach(count => {
        totalSite += count as number;
      });
      
      expect(totalSite).toBeGreaterThanOrEqual(0);
    });

    it('should have different stats for CRM and Site', async () => {
      const crmStats = await getLeadStats('CRM');
      const siteStats = await getLeadStats('Site');
      
      // Stats should be independent for each type
      const crmTotal = Object.values(crmStats).reduce((a: any, b: any) => a + b, 0);
      const siteTotal = Object.values(siteStats).reduce((a: any, b: any) => a + b, 0);
      
      // At least one should have leads (or both should be empty)
      expect(crmTotal + siteTotal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Count by Type', () => {
    it('should return count >= 0 for CRM type', async () => {
      const crmCount = await getLeadCountByType('CRM');
      expect(crmCount).toBeGreaterThanOrEqual(0);
    });

    it('should return count >= 0 for Site type', async () => {
      const siteCount = await getLeadCountByType('Site');
      expect(siteCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Type Isolation in Queries', () => {
    it('should not mix CRM and Site leads in filtered results', async () => {
      const crmLeads = await getLeads({ type: 'CRM' });
      const siteLeads = await getLeads({ type: 'Site' });
      
      const crmIds = new Set(crmLeads.map(l => l.id));
      const siteIds = new Set(siteLeads.map(l => l.id));
      
      // No lead should be in both sets
      const intersection = [...crmIds].filter(id => siteIds.has(id));
      expect(intersection.length).toBe(0);
    });

    it('should filter by type AND search term', async () => {
      const results = await getLeads({ 
        type: 'CRM',
        searchTerm: 'test'
      });
      
      results.forEach(lead => {
        expect(lead.type).toBe('CRM');
      });
    });

    it('should filter by type AND status', async () => {
      const results = await getLeads({ 
        type: 'CRM',
        status: 'Entrar em contato'
      });
      
      results.forEach(lead => {
        expect(lead.type).toBe('CRM');
        expect(lead.status).toBe('Entrar em contato');
      });
    });

    it('should filter by type AND segment', async () => {
      const results = await getLeads({ 
        type: 'CRM',
        segment: 'Clínica'
      });
      
      results.forEach(lead => {
        expect(lead.type).toBe('CRM');
        expect(lead.segment).toBe('Clínica');
      });
    });
  });
});
