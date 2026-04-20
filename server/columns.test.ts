import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, getKanbanColumns, createKanbanColumn, deleteKanbanColumn, getLeadsInColumn } from './db';
import { leads } from '../drizzle/schema';

describe('Kanban Columns Management', () => {
  let db: any;

  beforeEach(async () => {
    db = await getDb();
  });

  describe('getKanbanColumns', () => {
    it('should return list of columns with lead count', async () => {
      const columns = await getKanbanColumns();
      expect(Array.isArray(columns)).toBe(true);
      
      if (columns.length > 0) {
        const column = columns[0];
        expect(column).toHaveProperty('id');
        expect(column).toHaveProperty('name');
        expect(column).toHaveProperty('color');
        expect(column).toHaveProperty('leadCount');
        expect(typeof column.leadCount).toBe('number');
      }
    });

    it('should have valid color format for each column', async () => {
      const columns = await getKanbanColumns();
      
      columns.forEach(column => {
        expect(column.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('createKanbanColumn', () => {
    it('should create a new column with valid data', async () => {
      const newColumn = {
        name: 'Test Column ' + Date.now(),
        color: '#3B82F6',
        description: 'Test Description',
      };

      const result = await createKanbanColumn(newColumn);
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(newColumn.name);
      expect(result.color).toBe(newColumn.color);
      expect(result.description).toBe(newColumn.description);

      // Cleanup
      await deleteKanbanColumn(result.id);
    });

    it('should create column without description', async () => {
      const newColumn = {
        name: 'Test Column No Desc ' + Date.now(),
        color: '#06B6D4',
      };

      const result = await createKanbanColumn(newColumn);
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(newColumn.name);
      expect(result.color).toBe(newColumn.color);

      // Cleanup
      await deleteKanbanColumn(result.id);
    });
  });

  describe('getLeadsInColumn', () => {
    it('should return leads in a column (limited to 5)', async () => {
      // Get first column with leads
      const columns = await getKanbanColumns();
      const columnWithLeads = columns.find(c => c.leadCount > 0);

      if (columnWithLeads) {
        const leadsInColumn = await getLeadsInColumn(columnWithLeads.name);
        expect(Array.isArray(leadsInColumn)).toBe(true);
        expect(leadsInColumn.length).toBeLessThanOrEqual(5);
        
        if (leadsInColumn.length > 0) {
          const lead = leadsInColumn[0];
          expect(lead).toHaveProperty('id');
          expect(lead).toHaveProperty('company_name');
          expect(lead).toHaveProperty('status');
          expect(lead.status).toBe(columnWithLeads.name);
        }
      }
    });

    it('should return empty array for column with no leads', async () => {
      // Get first column without leads
      const columns = await getKanbanColumns();
      const emptyColumn = columns.find(c => c.leadCount === 0);

      if (emptyColumn) {
        const leadsInColumn = await getLeadsInColumn(emptyColumn.name);
        expect(Array.isArray(leadsInColumn)).toBe(true);
        expect(leadsInColumn.length).toBe(0);
      }
    });
  });

  describe('Column Color Validation', () => {
    it('should accept valid hex colors', async () => {
      const validColors = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
      
      for (const color of validColors) {
        const result = await createKanbanColumn({
          name: `Test ${color} ${Date.now()}`,
          color,
        });
        expect(result.color).toBe(color);
        await deleteKanbanColumn(result.id);
      }
    });
  });

  describe('Column Name Validation', () => {
    it('should enforce minimum name length', async () => {
      try {
        await createKanbanColumn({
          name: 'A', // Too short
          color: '#3B82F6',
        });
        expect.fail('Should have thrown error for short name');
      } catch (error: any) {
        expect(error.message).toContain('name');
      }
    });

    it('should enforce maximum name length', async () => {
      const longName = 'A'.repeat(51); // Too long
      try {
        await createKanbanColumn({
          name: longName,
          color: '#3B82F6',
        });
        expect.fail('Should have thrown error for long name');
      } catch (error: any) {
        expect(error.message).toContain('name');
      }
    });
  });
});
