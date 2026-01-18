import { jest, describe, it, expect, beforeAll, beforeEach } from "@jest/globals";

const mockAddBusinessDays = jest.fn();
const logWarnMock = jest.fn();

jest.unstable_mockModule("../../src/utils/dateUtils.js", () => ({
  __esModule: true,
  addBusinessDays: mockAddBusinessDays,
}));

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  __esModule: true,
  logWarn: logWarnMock,
}));

let calculateDueDate;
let buildPrazoSuggestion;

beforeAll(async () => {
  ({ calculateDueDate, buildPrazoSuggestion } = await import("../../src/services/prazoService.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAddBusinessDays.mockReset();
  mockAddBusinessDays.mockResolvedValue({ format: () => "2024-02-20" });
});

describe("prazoService", () => {
  it("calcula prazo útil usando addBusinessDays", async () => {
    const result = await calculateDueDate({
      startDate: "2024-02-10",
      prazoDias: 5,
      tipoPrazo: "util",
    });

    expect(mockAddBusinessDays).toHaveBeenCalledWith("2024-02-10", 5);
    expect(result).toBe("2024-02-20");
  });

  it("calcula prazo corrido somando dias", async () => {
    const result = await calculateDueDate({
      startDate: "2024-02-10",
      prazoDias: 5,
      tipoPrazo: "corrido",
    });

    expect(result).toBe("2024-02-15");
    expect(mockAddBusinessDays).not.toHaveBeenCalled();
  });

  it("aceita data fixa quando tipo_prazo é data_fixa", async () => {
    const result = await calculateDueDate({
      startDate: "2024-02-10",
      prazoDias: 5,
      tipoPrazo: "data_fixa",
      fixedDate: "2026-02-01",
    });

    expect(result).toBe("2026-02-01");
  });

  it("retorna null quando faltam dados essenciais", async () => {
    const result = await buildPrazoSuggestion({
      dataPublicacao: null,
      prazoDias: 10,
      tipoPrazo: "util",
    });

    expect(result).toBeNull();
  });
});
