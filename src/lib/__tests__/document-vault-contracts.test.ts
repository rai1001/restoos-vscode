import {
  DOC_STATUS,
  DOC_TYPE,
  DOC_SOURCE,
  CUSTODY_ACTION,
  INTEGRITY_STATUS,
  CHECK_TYPE,
  LINKED_ENTITY_TYPE,
  DOC_STATUS_TRANSITIONS,
  type DocStatus,
} from "@/contracts/document-vault";

// ── DOC_STATUS ─────────────────────────────────────────────────────────────

describe("DOC_STATUS", () => {
  it("has exactly 5 statuses", () => {
    expect(Object.keys(DOC_STATUS)).toHaveLength(5);
  });

  it("contains all expected statuses", () => {
    expect(DOC_STATUS.DIGITALIZANDO).toBe("digitalizando");
    expect(DOC_STATUS.DIGITALIZADO).toBe("digitalizado");
    expect(DOC_STATUS.NECESITA_REVISION).toBe("necesita_revision");
    expect(DOC_STATUS.RECHAZADO).toBe("rechazado");
    expect(DOC_STATUS.ELIMINADO).toBe("eliminado");
  });
});

// ── DOC_STATUS_TRANSITIONS ─────────────────────────────────────────────────

describe("DOC_STATUS_TRANSITIONS", () => {
  it("digitalizando can transition to digitalizado, necesita_revision, or rechazado", () => {
    const transitions = DOC_STATUS_TRANSITIONS.digitalizando;
    expect(transitions).toContain("digitalizado");
    expect(transitions).toContain("necesita_revision");
    expect(transitions).toContain("rechazado");
    expect(transitions).not.toContain("eliminado");
  });

  it("digitalizado can only transition to eliminado", () => {
    const transitions = DOC_STATUS_TRANSITIONS.digitalizado;
    expect(transitions).toEqual(["eliminado"]);
  });

  it("necesita_revision can transition to digitalizado, rechazado, or eliminado", () => {
    const transitions = DOC_STATUS_TRANSITIONS.necesita_revision;
    expect(transitions).toHaveLength(3);
    expect(transitions).toContain("digitalizado");
    expect(transitions).toContain("rechazado");
    expect(transitions).toContain("eliminado");
  });

  it("rechazado can only transition to eliminado", () => {
    expect(DOC_STATUS_TRANSITIONS.rechazado).toEqual(["eliminado"]);
  });

  it("eliminado is a terminal state (no transitions)", () => {
    expect(DOC_STATUS_TRANSITIONS.eliminado).toEqual([]);
  });

  it("all statuses have defined transitions", () => {
    const allStatuses = Object.values(DOC_STATUS);
    for (const status of allStatuses) {
      expect(DOC_STATUS_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(DOC_STATUS_TRANSITIONS[status])).toBe(true);
    }
  });

  it("all target transitions are valid statuses", () => {
    const allStatuses = new Set(Object.values(DOC_STATUS));
    for (const [, targets] of Object.entries(DOC_STATUS_TRANSITIONS)) {
      for (const target of targets) {
        expect(allStatuses.has(target)).toBe(true);
      }
    }
  });
});

// ── DOC_TYPE ───────────────────────────────────────────────────────────────

describe("DOC_TYPE", () => {
  it("has exactly 6 document types", () => {
    expect(Object.keys(DOC_TYPE)).toHaveLength(6);
  });

  it("contains all expected types", () => {
    expect(DOC_TYPE.FACTURA).toBe("factura");
    expect(DOC_TYPE.ALBARAN).toBe("albaran");
    expect(DOC_TYPE.TICKET).toBe("ticket");
    expect(DOC_TYPE.APPCC_CIERRE).toBe("appcc_cierre");
    expect(DOC_TYPE.APPCC_INCIDENCIA).toBe("appcc_incidencia");
    expect(DOC_TYPE.CERTIFICADO_PROVEEDOR).toBe("certificado_proveedor");
  });

  it("values match SQL CHECK constraint values", () => {
    const sqlValues = [
      "factura", "albaran", "ticket", "appcc_cierre",
      "appcc_incidencia", "certificado_proveedor",
    ];
    const tsValues = Object.values(DOC_TYPE);
    expect(tsValues.sort()).toEqual(sqlValues.sort());
  });
});

// ── DOC_SOURCE ─────────────────────────────────────────────────────────────

describe("DOC_SOURCE", () => {
  it("has exactly 4 sources", () => {
    expect(Object.keys(DOC_SOURCE)).toHaveLength(4);
  });

  it("values match SQL CHECK constraint", () => {
    const sqlValues = ["upload_manual", "email_auto", "ocr_scan", "api_import"];
    const tsValues = Object.values(DOC_SOURCE);
    expect(tsValues.sort()).toEqual(sqlValues.sort());
  });
});

// ── CUSTODY_ACTION ─────────────────────────────────────────────────────────

describe("CUSTODY_ACTION", () => {
  it("has exactly 10 actions", () => {
    expect(Object.keys(CUSTODY_ACTION)).toHaveLength(10);
  });

  it("includes critical audit actions", () => {
    expect(CUSTODY_ACTION.CREATED).toBe("created");
    expect(CUSTODY_ACTION.VIEWED).toBe("viewed");
    expect(CUSTODY_ACTION.DOWNLOADED).toBe("downloaded");
    expect(CUSTODY_ACTION.VERIFIED).toBe("verified");
    expect(CUSTODY_ACTION.STATUS_CHANGED).toBe("status_changed");
    expect(CUSTODY_ACTION.BACKUP_CREATED).toBe("backup_created");
    expect(CUSTODY_ACTION.RESTORED).toBe("restored");
  });
});

// ── INTEGRITY_STATUS ───────────────────────────────────────────────────────

describe("INTEGRITY_STATUS", () => {
  it("has exactly 3 statuses", () => {
    expect(Object.keys(INTEGRITY_STATUS)).toHaveLength(3);
  });

  it("contains passed, failed, warning", () => {
    expect(INTEGRITY_STATUS.PASSED).toBe("passed");
    expect(INTEGRITY_STATUS.FAILED).toBe("failed");
    expect(INTEGRITY_STATUS.WARNING).toBe("warning");
  });
});

// ── CHECK_TYPE ─────────────────────────────────────────────────────────────

describe("CHECK_TYPE", () => {
  it("has exactly 3 check types", () => {
    expect(Object.keys(CHECK_TYPE)).toHaveLength(3);
  });

  it("matches SQL CHECK constraint", () => {
    const sqlValues = ["hash_verify", "backup_verify", "cross_reference"];
    const tsValues = Object.values(CHECK_TYPE);
    expect(tsValues.sort()).toEqual(sqlValues.sort());
  });
});

// ── LINKED_ENTITY_TYPE ─────────────────────────────────────────────────────

describe("LINKED_ENTITY_TYPE", () => {
  it("has exactly 5 entity types", () => {
    expect(Object.keys(LINKED_ENTITY_TYPE)).toHaveLength(5);
  });

  it("contains all linkable entities", () => {
    expect(LINKED_ENTITY_TYPE.FACTURA_RECIBIDA).toBe("factura_recibida");
    expect(LINKED_ENTITY_TYPE.GOODS_RECEIPT).toBe("goods_receipt");
    expect(LINKED_ENTITY_TYPE.APPCC_DAILY_CLOSURE).toBe("appcc_daily_closure");
    expect(LINKED_ENTITY_TYPE.APPCC_INCIDENT).toBe("appcc_incident");
    expect(LINKED_ENTITY_TYPE.PURCHASE_ORDER).toBe("purchase_order");
  });
});

// ── Transition helper ──────────────────────────────────────────────────────

describe("isValidTransition (derived)", () => {
  function isValidTransition(from: DocStatus, to: DocStatus): boolean {
    return DOC_STATUS_TRANSITIONS[from].includes(to);
  }

  it("allows digitalizando → digitalizado", () => {
    expect(isValidTransition("digitalizando", "digitalizado")).toBe(true);
  });

  it("blocks digitalizado → digitalizando (no rollback)", () => {
    expect(isValidTransition("digitalizado", "digitalizando")).toBe(false);
  });

  it("blocks eliminado → anything (terminal)", () => {
    const allStatuses = Object.values(DOC_STATUS);
    for (const target of allStatuses) {
      expect(isValidTransition("eliminado", target)).toBe(false);
    }
  });

  it("allows necesita_revision → digitalizado (after fixing)", () => {
    expect(isValidTransition("necesita_revision", "digitalizado")).toBe(true);
  });
});
