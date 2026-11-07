# IDL 1.1.1 Reconciliation (F0) — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Portare suite di test e gate di release al verde su IDL `1.1.1` e fee `0.04 SOL`, senza toccare il numero di versione del pacchetto (npm resta `1.0.3` fino alla release SNS).

**Architecture:** Gli ultimi 3 commit (94f392c, 5b0f1c6, 4ef5fbd) hanno allineato l'IDL embedded a `1.1.1` senza aggiornare smoke test, gate di release e costante fee. La correzione è 4 file puntuali + CHANGELOG; nessun cambiamento di superficie API.

**Tech stack:** TypeScript, vitest 4, npm/yarn (CI usa `npm ci`).

**Branch:** `fix/idl-1.1.1-reconciliation` da `development @ 94f392c` (verificato 05-11: `origin/development` == main @ 94f392c, delta 0/0). PR → `development`; release da `main` via tag.

**Evidence di riferimento (KB repo):** `docs/agent-knowledge/TECHNICAL_DEBT.md` §Release; programma on-chain @ `049e3b7`, `programs/synapse-agent-sap/src/constants.rs:10` = `40_000_000` lamports.

---

### Task 1: Baseline e installazione coerente con CI

**Objective:** Avere node_modules conformi a CI (`npm ci`) e registrare lo stato di partenza esatto.

**Step 1:** `npm ci` (root). Se fallisce per lockfile, registrare l'errore (i due lockfile yarn.lock/package-lock.json coesistono: è il sospetto n.1 per il lint rotto del Task 6).

**Step 2:** Run: `npx vitest run`
Expected: `26 tests, 25 passed, 1 failed` — il fallito è `smoke.test.ts:57` (`expected '1.0.3' received '1.1.1'`).

**Step 3:** Run: `npm run build`
Expected: PASS (~3.3s, ESM+CJS).

---

### Task 2: Allineare lo smoke test alla 1.1.1

**Objective:** Lo smoke test deve aspettare l'IDL effettivamente spedita.

**Files:**
- Modify: `src/__tests__/smoke.test.ts:56-57`

```ts
// prima
it("ships the canonical 1.0.3 IDL without legacy escrow instructions", () => {
  expect(idl.metadata.version).toBe("1.0.3");

// dopo
it("ships the canonical 1.1.1 IDL without legacy escrow instructions", () => {
  expect(idl.metadata.version).toBe("1.1.1");
```

**Step 3:** Run: `npx vitest run`
Expected: `26 tests, 26 passed`. (I check "no legacy escrow instructions" restano validi: `create_escrow`/`deposit_escrow`/`settle_calls` non esistono né in 1.0.3 né in 1.1.1.)

**Step 4:** Commit: `fix: align smoke test to IDL 1.1.1`

---

### Task 3: Allineare il gate di release

**Objective:** `verify:release` deve accettare l'IDL spedita.

**Files:**
- Modify: `scripts/verify-release.mjs:13`

```js
// prima
const expectedProgramVersion = "1.0.3";
// dopo
const expectedProgramVersion = "1.1.1";
```

Le shape-check dentro il file (`settle_calls_v2` 5 accounts/3 args, `create_escrow_v2`, `close_stake`, golden PDA) **non cambiano**: passano già con l'IDL 1.1.1.

**Step 2:** Run: `npm run verify:release`
Expected: PASS (completo: clean+build+test, pack SDK+CLI, consumer install CJS/ESM, secret-scan ~ minuti). Se fallisce su un check diverso da `IDL metadata version`, fermarsi e riportare l'output — non improvvisare.

**Step 3:** Commit: `fix: align verify-release expectedProgramVersion to 1.1.1`

---

### Task 4: Fee di registrazione 0.04 SOL

**Objective:** Allineare la costante SDK alla verità on-chain del programma v1.1.1.

**Files:**
- Modify: `src/constants/treasury.ts:32`

```ts
// prima
export const REGISTRATION_FEE_LAMPORTS = 100_000_000;
// dopo
/**
 * Matches SAP program v1.1.1 (synapse-sap, constants.rs:10 = 40_000_000).
 */
export const REGISTRATION_FEE_LAMPORTS = 40_000_000;
```

**Step 2:** Catturare eventuali riferimenti stale: `grep -rn "100_000_000\|0\.1 SOL\|0.1 SOL" src/ README.md docs/ --include="*.ts" --include="*.md" | grep -vi changelog`
Expected: nessun altro uso di codice con la fee vecchia (i mention doc si sistemano in F5/docs, non qui); correggere solo i codici trovati.

**Step 3:** Run: `npx vitest run` e `npm run build`
Expected: PASS (la costante è sola lettura per la codebase: nessun test la referenzia direttamente).

**Step 4:** Commit: `fix(registration-fee): align REGISTRATION_FEE_LAMPORTS to program 0.04 SOL`

---

### Task 5: CHANGELOG [Unreleased]

**Files:**
- Modify: `CHANGELOG.md` (sopra la sezione `[1.0.3]`)

```markdown
## [Unreleased]

### Fixed
- Release metadata reconciled to IDL **1.1.1** (smoke test + `verify:release` gate):
  the IDL had been aligned in 94f392c/5b0f1c6 without updating the gates.
- `REGISTRATION_FEE_LAMPORTS` aligned to the on-chain program v1.1.1 fee
  (0.1 → 0.04 SOL).
```

**Step 2:** Commit: `docs(changelog): record 1.1.1 metadata + fee reconciliation`

---

### Task 6 (contingenza): ripristinare `npm run lint`

**Objective:** CI (`sdk-ci.yml`) gira `npm run lint`; oggi esce 2 perché `@typescript-eslint/eslint-plugin` non risulta installato (doppio lockfile: `yarn.lock` + `package-lock.json`).

**Step 1:** Run: `npm ls @typescript-eslint/eslint-plugin --depth=0`
Expected: attualmente *(empty)* → dopo `npm ci` del Task 1 dovrebbe apparire la versione dichiarata in `package.json` devDeps.

**Step 2 (se npm ci non lo ripristina):** confrontare devDeps in `package.json` con le voci in `package-lock.json`:
`grep -c "typescript-eslint" package-lock.json` — se assente/mancanti, rigenerare SOLO il lockfile npm: `npm install --package-lock-only` (non tocca node_modules né yarn.lock), poi `npm ci` di nuovo.

**Step 3:** Run: `npm run lint`
Expected: exit 0. Se emergono errori reali di stile, sono debito preesistente documentato: fermarsi e riportare (scope F0 = gate verdi, non reformat).

**Step 4:** Run: `npx prettier --check` sui SOLI 5 file toccati (smoke.test.ts, verify-release.mjs, treasury.ts, CHANGELOG.md) e formattarli se richiesto. Il resto dei 77 file non conformi è fuori scope (debt separato).

**Step 5:** Commit: `chore: restore npm lint gate (lockfile consistency)`

---

### Verify finale (gate della F0)

```bash
npx vitest run        # 26/26 pass
npm run build         # pass
npm run lint          # exit 0
npm run verify:release  # pass completo
```

Nota di scope: README numerici stanti (17 PDA, 38 eventi, ecc.) NON sono in questa F0 — appartengono alla fase docs (F5, dentro il branch SNS o dedicata).
