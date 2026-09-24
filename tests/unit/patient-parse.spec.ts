import { describe, expect, it } from "vitest";

import { ValidationError } from "@/server/errors";
import { parseIsoDate, parsePatientInput } from "@/server/modules/patient/patient.parse";

const today = "2026-09-24";

describe("parsePatientInput", () => {
  it("normaliza nome, telefone e textos vazios", () => {
    const input = parsePatientInput(
      {
        fullName: "  Lucas Almeida ",
        birthDate: "2018-03-10",
        healthInfo: "   ",
        guardians: [{ name: "Carla", relationship: "Mãe", phone: "(27) 99911-0001" }],
      },
      today,
    );
    expect(input.fullName).toBe("Lucas Almeida");
    expect(input.healthInfo).toBeNull();
    expect(input.guardians[0]).toMatchObject({ phone: "27999110001", isPrimary: true });
  });

  it("exige o nome do paciente", () => {
    expect(() => parsePatientInput({ fullName: " " }, today)).toThrow(ValidationError);
  });

  it("aceita paciente sem responsável e sem data de nascimento", () => {
    const input = parsePatientInput({ fullName: "Laura Nunes" }, today);
    expect(input.guardians).toEqual([]);
    expect(input.birthDate).toBeNull();
  });

  it("rejeita nascimento no futuro", () => {
    expect(() => parsePatientInput({ fullName: "Ana", birthDate: "2027-01-01" }, today)).toThrow(/futuro/);
  });

  it("rejeita telefone sem DDD", () => {
    expect(() =>
      parsePatientInput(
        { fullName: "Ana", guardians: [{ name: "Pai", relationship: "Pai", phone: "99999-9999" }] },
        today,
      ),
    ).toThrow(/DDD/);
  });

  it("mantém só um responsável principal", () => {
    const input = parsePatientInput(
      {
        fullName: "Ana",
        guardians: [
          { name: "Mãe", relationship: "Mãe", isPrimary: true },
          { name: "Pai", relationship: "Pai", isPrimary: true },
        ],
      },
      today,
    );
    expect(input.guardians.map((g) => g.isPrimary)).toEqual([true, false]);
  });

  it("usa o primeiro como principal quando nenhum foi marcado", () => {
    const input = parsePatientInput(
      { fullName: "Ana", guardians: [{ name: "Avó", relationship: "Avó" }, { name: "Pai", relationship: "Pai" }] },
      today,
    );
    expect(input.guardians.map((g) => g.isPrimary)).toEqual([true, false]);
  });
});

describe("parseIsoDate", () => {
  it("rejeita datas que não existem", () => {
    expect(() => parseIsoDate("2026-02-31", "a data")).toThrow(/calendário/);
    expect(() => parseIsoDate("24/09/2026", "a data")).toThrow(ValidationError);
    expect(parseIsoDate("2024-02-29", "a data")).toBe("2024-02-29");
  });
});
