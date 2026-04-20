import { describe, it, expect } from "vitest";
import { formatPhoneForWhatsApp, generateWhatsAppURL } from "./whatsapp";

describe("WhatsApp Utilities", () => {
  describe("formatPhoneForWhatsApp", () => {
    it("should format phone with parentheses and hyphen", () => {
      const result = formatPhoneForWhatsApp("(11) 98765-4321");
      expect(result).toBe("5511987654321");
    });

    it("should format phone without formatting", () => {
      const result = formatPhoneForWhatsApp("11987654321");
      expect(result).toBe("5511987654321");
    });

    it("should format phone with country code", () => {
      const result = formatPhoneForWhatsApp("+55 11 98765-4321");
      expect(result).toBe("5511987654321");
    });

    it("should format phone with spaces", () => {
      const result = formatPhoneForWhatsApp("11 9 8765 4321");
      expect(result).toBe("5511987654321");
    });

    it("should handle phone with leading zero", () => {
      const result = formatPhoneForWhatsApp("011987654321");
      expect(result).toBe("5511987654321");
    });

    it("should return null for invalid phone", () => {
      const result = formatPhoneForWhatsApp("123");
      expect(result).toBeNull();
    });

    it("should return null for empty phone", () => {
      const result = formatPhoneForWhatsApp("");
      expect(result).toBeNull();
    });

    it("should return null for phone with letters", () => {
      const result = formatPhoneForWhatsApp("(11) 9876A-4321");
      expect(result).toBeNull();
    });

    it("should handle phone with + and spaces", () => {
      const result = formatPhoneForWhatsApp("+55 (11) 98765-4321");
      expect(result).toBe("5511987654321");
    });
  });

  describe("generateWhatsAppURL", () => {
    it("should generate URL without message", () => {
      const result = generateWhatsAppURL("(11) 98765-4321");
      expect(result).toBe("https://wa.me/5511987654321");
    });

    it("should generate URL with message", () => {
      const result = generateWhatsAppURL("(11) 98765-4321", "Olá!");
      expect(result).toContain("https://wa.me/5511987654321");
      expect(result).toContain("?text=");
      expect(result).toContain("Ol%C3%A1");
    });

    it("should encode special characters in message", () => {
      const result = generateWhatsAppURL("(11) 98765-4321", "Olá! Como vai?");
      expect(result).toContain("Ol%C3%A1");
      expect(result).toContain("Como");
    });

    it("should return null for invalid phone", () => {
      const result = generateWhatsAppURL("123");
      expect(result).toBeNull();
    });
  });
});
