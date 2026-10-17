/** @jest-environment node */
import { createServer, type Server } from "node:http"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { join, resolve, sep } from "node:path"
import { tmpdir } from "node:os"
import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { transpileModule, ModuleKind, ScriptTarget } from "typescript"
import type * as QueueModule from "../offline-local-queue"

declare const window: Window & { queue: typeof QueueModule; config: QueueModule.OfflineLocalQueueConfig }

// Real Chromium transactions, multiple tabs and restarts. No IndexedDB storage mock.
describe("offline local POS queue with browser storage", () => {
  let server: Server
  let browser: Browser
  let context: BrowserContext
  let page: Page
  let url: string
  jest.setTimeout(60_000)

  async function openPage(browserContext = context) {
    const tab = await browserContext.newPage()
    await tab.goto(url)
    await tab.addScriptTag({ type: "module", content: 'import * as queue from "/queue.js"; window.queue = queue;' })
    await tab.waitForFunction(() => Boolean(window.queue))
    await tab.evaluate(() => {
      window.config = { organizationKey: "org-1", deviceId: "device-1", terminalId: "terminal-1", locationId: "loc-1", sessionId: "session-1" }
    })
    return tab
  }

  beforeAll(async () => {
    const source = transpileModule(readFileSync(join(process.cwd(), "lib/pos/offline-local-queue.ts"), "utf8"), {
      compilerOptions: { module: ModuleKind.ES2022, target: ScriptTarget.ES2022 },
    }).outputText
    server = createServer((request, response) => {
      response.setHeader("Content-Type", request.url === "/queue.js" ? "text/javascript" : "text/html")
      response.end(request.url === "/queue.js" ? source : "<!doctype html><title>Isolated offline queue verification</title>")
    })
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Test server did not bind")
    url = `http://127.0.0.1:${address.port}`
    browser = await chromium.launch({ headless: true })
  })
  beforeEach(async () => { context = await browser.newContext(); page = await openPage() })
  afterEach(async () => { await context?.close() })
  afterAll(async () => {
    await browser?.close()
    await new Promise<void>(resolve => server?.close(() => resolve()))
  })

  it("discovers local-only queues without server enrollment and blocks close across sessions", async () => {
    const result = await page.evaluate(async () => {
      await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SESSION_EVIDENCE", payload: { private: "never in summary" } })
      const queues = await window.queue.inspectOfflineLocalQueues({ organizationKey: "org-1", terminalId: "terminal-1" })
      let blocked = false
      try { await window.queue.assertNoLocalOfflineWork({ organizationKey: "org-1", terminalId: "terminal-1" }) } catch { blocked = true }
      return { queues, blocked, foreign: await window.queue.inspectOfflineLocalQueues({ organizationKey: "foreign" }), other: await window.queue.inspectOfflineLocalQueues({ organizationKey: "org-1", terminalId: "other" }) }
    })
    expect(result).toMatchObject({ blocked: true, foreign: [], other: [], queues: [{ pendingCount: 1, acknowledgedCount: 0 }] })
    expect(JSON.stringify(result)).not.toContain("never in summary")
  })

  it("detects another tab's queue and distinguishes ingestion acknowledgement from financial completion", async () => {
    const other = await openPage()
    await other.evaluate(() => window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SESSION_EVIDENCE", payload: {} }))
    expect(await page.evaluate(() => window.queue.inspectOfflineLocalQueues({ organizationKey: "org-1" }))).toMatchObject([{ pendingCount: 1 }])
    await other.evaluate(async () => {
      const claim = await window.queue.claimOfflineLocalQueueBatch(window.config)
      if (claim.skipped) throw new Error("Expected claim")
      await window.queue.settleOfflineLocalQueueBatch(window.config, claim, { status: "SYNCED", serverBatchId: "ack-only" })
    })
    expect(await page.evaluate(() => window.queue.inspectOfflineLocalQueues({ organizationKey: "org-1" }))).toMatchObject([{ pendingCount: 0, acknowledgedCount: 1 }])
    expect(await page.evaluate(async () => { await window.queue.assertNoLocalOfflineWork({ organizationKey: "org-1" }); return true })).toBe(true)
  })

  it("fails closed for an orphaned migration marker instead of reporting an empty inventory", async () => {
    await page.evaluate(() => localStorage.setItem(window.queue.offlineQueueStorageKey(window.config) + ":indexeddb-migrated", "1"))
    await expect(page.evaluate(() => window.queue.inspectOfflineLocalQueues({ organizationKey: "org-1" }))).rejects.toThrow(/quarantined/)
  })

  it.each(["missing state", "null record"])("does not replace a damaged durable %s with an empty legacy snapshot", async damage => {
    await page.evaluate(async damage => {
      const empty = await window.queue.loadOfflineLocalQueue(window.config)
      await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SESSION_EVIDENCE", payload: { retained: true } })
      const key = window.queue.offlineQueueStorageKey(window.config), legacy = JSON.stringify(empty)
      localStorage.setItem(key, legacy)
      localStorage.removeItem(key + ":indexeddb-migrated")
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("aqstoqflow-pos-offline-queue", 1)
        request.onsuccess = () => {
          const database = request.result, tx = database.transaction("queues", "readwrite"), store = tx.objectStore("queues")
          store.put(damage === "null record" ? null : { revision: 1, legacySnapshot: legacy }, key)
          tx.oncomplete = () => { database.close(); resolve() }
          tx.onabort = () => reject(tx.error)
        }
      })
    }, damage)
    await expect(page.evaluate(() => window.queue.assertNoLocalOfflineWork({ organizationKey: "org-1" }))).rejects.toThrow(/quarantined/)
    expect(await page.evaluate(() => localStorage.getItem(window.queue.offlineQueueStorageKey(window.config)))).not.toBeNull()
  })

  it("quarantines altered payloads during inventory without deleting their evidence", async () => {
    await page.evaluate(async () => {
      const entry = await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SESSION_EVIDENCE", payload: { original: true } })
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("aqstoqflow-pos-offline-queue", 1)
        request.onsuccess = () => {
          const database = request.result, tx = database.transaction("queues", "readwrite"), store = tx.objectStore("queues"), key = window.queue.offlineQueueStorageKey(window.config)
          const read = store.get(key)
          read.onsuccess = () => { const record = read.result; record.state.entries[0].event.payload = { altered: true }; store.put(record, key) }
          tx.oncomplete = () => { database.close(); resolve() }
          tx.onabort = () => reject(tx.error)
        }
      })
      return entry.queueId
    })
    await expect(page.evaluate(() => window.queue.assertNoLocalOfflineWork({ organizationKey: "org-1" }))).rejects.toThrow(/quarantined/)
  })

  it("P06 preserves unknown evidence through real browser offline and reconnect transitions", async () => {
    const original = await page.evaluate(() => window.queue.enqueueOfflineLocalEvent(window.config, {
      eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "p06-reconnect" },
    }))
    await context.setOffline(true)
    try {
      const uncertain = await page.evaluate(async () => {
        const claim = await window.queue.claimOfflineLocalQueueBatch(window.config)
        if (claim.skipped) throw new Error("Expected original claim")
        let failedTransport = false
        try { await fetch("/p06-connectivity-probe", { cache: "no-store" }) }
        catch { failedTransport = true; await window.queue.settleOfflineLocalQueueBatch(window.config, claim, { status: "UNCERTAIN" }) }
        return { failedTransport, state: await window.queue.loadOfflineLocalQueue(window.config) }
      })
      expect(uncertain.failedTransport).toBe(true)
      expect(uncertain.state.entries[0]).toMatchObject({ event: original.event, status: "UNCERTAIN", lastSyncError: "SERVER_OUTCOME_UNCONFIRMED" })
    } finally {
      await context.setOffline(false)
    }
    await page.reload()
    await page.addScriptTag({ type: "module", content: 'import * as queue from "/queue.js"; window.queue = queue;' })
    await page.waitForFunction(() => Boolean(window.queue))
    const recovered = await page.evaluate(async () => {
      window.config = { organizationKey: "org-1", deviceId: "device-1", terminalId: "terminal-1", locationId: "loc-1", sessionId: "session-1" }
      const reachable = (await fetch("/p06-connectivity-probe", { cache: "no-store" })).ok
      const claim = await window.queue.claimOfflineLocalQueueBatch(window.config)
      return { reachable, claim, state: await window.queue.loadOfflineLocalQueue(window.config), userAgent: navigator.userAgent }
    })
    expect(recovered.reachable).toBe(true)
    expect(recovered.claim.skipped).toBe(false)
    if (recovered.claim.skipped) throw new Error("Expected original-identity retry")
    expect(recovered.claim.envelope.events).toEqual([original.event])
    expect(recovered.state.entries[0]).toMatchObject({ status: "SYNCING", syncAttempts: 2 })
    expect(recovered.state.entries[0].lastServerBatchId).toBeUndefined()
    // The probe server is not ingestion: reconnect alone must never mark evidence SYNCED.
    console.info("P06_BROWSER_ENVELOPE", JSON.stringify({ version: browser.version(), userAgent: recovered.userAgent, viewport: page.viewportSize(), fixture: "isolated-localhost-queue", networkTransition: "offline-to-online", applicationServer: false }))
  })

  it("conserves concurrent acknowledgements across tabs, reload and a continuous hash chain", async () => {
    const second = await openPage()
    const capture = (tab: Page, prefix: string) => tab.evaluate(async prefix => Promise.all(Array.from({ length: 12 }, (_, index) =>
      window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: `${prefix}-${index}` } }))), prefix)
    const acknowledgements = (await Promise.all([capture(page, "A"), capture(second, "B")])).flat()
    expect(new Set(acknowledgements.map(entry => entry.event.deviceSeq)).size).toBe(24)
    await page.close()
    page = await openPage()
    const persisted = await page.evaluate(() => window.queue.loadOfflineLocalQueue(window.config))
    expect(persisted.entries).toHaveLength(24)
    expect(persisted.nextSequence).toBe(25)
    expect(new Set(persisted.entries.map(entry => entry.queueId))).toEqual(new Set(acknowledgements.map(entry => entry.queueId)))
    persisted.entries.slice(1).forEach((entry, index) => expect(entry.event.prevHash).toBe(persisted.entries[index].event.entryHash))
    expect(persisted.highWaterHash).toBe(persisted.entries[23].event.entryHash)
  })

  it("keeps final fiscal numbering unavailable to caller-controlled queue input", async () => {
    await expect(page.evaluate(() => window.queue.enqueueOfflineLocalEvent(window.config, {
      eventType: "OFFLINE_RECEIPT_PROVISIONED", payload: { nested: { legalNumber: "CM-FINAL-1" } },
      metadata: { offlineReceiptPolicy: { finalFiscalNumberingPermitted: true } },
    }))).rejects.toThrow(/provisional receipt evidence/i)
    const entry = await page.evaluate(() => window.queue.enqueueOfflineLocalEvent(window.config, {
      eventType: "OFFLINE_RECEIPT_PROVISIONED", payload: { provisionalNumber: "LOCAL-1" },
      metadata: { offlineReceiptPolicy: { finalFiscalNumberingPermitted: true } },
    }))
    expect(entry.event.metadata).toMatchObject({ offlineReceiptPolicy: { finalFiscalNumberingPermitted: false, receiptStatus: "PROVISIONAL_ONLY" } })
  })

  it.each(["{damaged-json", "{}", '{"queueVersion":1,"entries":[]}'])("quarantines corrupt legacy bytes without resetting identities (%s)", async raw => {
    await page.evaluate(raw => localStorage.setItem(window.queue.offlineQueueStorageKey(window.config), raw), raw)
    await expect(page.evaluate(() => window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "new" } }))).rejects.toThrow(/quarantined/i)
    expect(await page.evaluate(() => localStorage.getItem(window.queue.offlineQueueStorageKey(window.config)))).toBe(raw)
  })

  it("migrates legacy SYNCING evidence without replacing identities, and retains original bytes", async () => {
    const legacy = await page.evaluate(async () => {
      await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "legacy" } })
      const state = await window.queue.loadOfflineLocalQueue(window.config)
      state.organizationKey = window.config.organizationKey = "legacy-org"
      state.entries[0].status = "SYNCING"
      const raw = JSON.stringify(state)
      localStorage.setItem(window.queue.offlineQueueStorageKey(window.config), raw)
      return { raw, event: state.entries[0].event }
    })
    const result = await page.evaluate(async () => ({
      claim: await window.queue.claimOfflineLocalQueueBatch(window.config),
      raw: localStorage.getItem(window.queue.offlineQueueStorageKey(window.config)),
    }))
    expect(result.raw).toBe(legacy.raw)
    expect(result.claim.skipped).toBe(false)
    if (result.claim.skipped) throw new Error("Expected recovered claim")
    expect(result.claim.envelope.events).toEqual([legacy.event])
  })

  it("recovers an interrupted migration after marker write failure", async () => {
    const result = await page.evaluate(async () => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function () { throw new DOMException("Storage denied", "QuotaExceededError") }
      let rejected = false
      try { await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "not-acknowledged" } }) }
      catch { rejected = true }
      finally { Storage.prototype.setItem = original }
      const next = await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "retry" } })
      return { rejected, sequence: next.event.deviceSeq, state: await window.queue.loadOfflineLocalQueue(window.config) }
    })
    expect(result.rejected).toBe(true)
    expect(result.sequence).toBe(1)
    expect(result.state.entries).toHaveLength(1)
  })

  it("does not acknowledge an injected quota failure or lose previously committed evidence", async () => {
    const result = await page.evaluate(async () => {
      const first = await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "retained" } })
      const original = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function () { throw new DOMException("Quota exceeded", "QuotaExceededError") }
      let rejected = false
      try { await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "failed" } }) }
      catch { rejected = true }
      finally { IDBObjectStore.prototype.put = original }
      return { rejected, first, state: await window.queue.loadOfflineLocalQueue(window.config) }
    })
    expect(result.rejected).toBe(true)
    expect(result.state.entries).toEqual([result.first])
    expect(result.state.nextSequence).toBe(2)
  })

  it("does not acknowledge a transaction aborted after its write request", async () => {
    const result = await page.evaluate(async () => {
      await window.queue.loadOfflineLocalQueue(window.config)
      const original = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore["put"]>) {
        const request = original.apply(this, args)
        this.transaction.abort()
        return request
      }
      let rejected = false
      try { await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: {} }) }
      catch { rejected = true }
      finally { IDBObjectStore.prototype.put = original }
      return { rejected, state: await window.queue.loadOfflineLocalQueue(window.config) }
    })
    expect(result.rejected).toBe(true)
    expect(result.state.entries).toHaveLength(0)
  })

  it("allows only one active cross-tab lease and retries original identities after tab termination", async () => {
    const second = await openPage()
    const entry = await page.evaluate(() => window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "recover" } }))
    const claims = await Promise.all([page, second].map(tab => tab.evaluate(() => window.queue.claimOfflineLocalQueueBatch(window.config))))
    expect(claims.filter(claim => !claim.skipped)).toHaveLength(1)
    expect(claims.filter(claim => claim.skipped)).toEqual([expect.objectContaining({ reason: "LEASE_ACTIVE" })])
    await page.close()
    await second.close()
    page = await openPage()
    const claim = await page.evaluate(() => window.queue.claimOfflineLocalQueueBatch({ ...window.config, now: () => new Date(Date.now() + window.queue.OFFLINE_SYNC_LEASE_MS + 1_000) }))
    expect(claim.skipped).toBe(false)
    if (claim.skipped) throw new Error("Expected recovered lease")
    expect(claim.envelope.events).toEqual([entry.event])
    const state = await page.evaluate(() => window.queue.loadOfflineLocalQueue(window.config))
    expect(state.entries[0].syncAttempts).toBe(2)
  })

  it("retains uncertain evidence, retries without a replacement identity and ignores stale responses", async () => {
    const result = await page.evaluate(async () => {
      const original = await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "uncertain" } })
      const first = await window.queue.claimOfflineLocalQueueBatch(window.config)
      if (first.skipped) throw new Error("Missing first claim")
      await window.queue.settleOfflineLocalQueueBatch(window.config, first, { status: "UNCERTAIN" })
      const retry = await window.queue.claimOfflineLocalQueueBatch(window.config)
      if (retry.skipped) throw new Error("Missing retry")
      await window.queue.settleOfflineLocalQueueBatch(window.config, first, { status: "SYNCED", serverBatchId: "late-batch" })
      const stale = await window.queue.loadOfflineLocalQueue(window.config)
      await window.queue.settleOfflineLocalQueueBatch(window.config, retry, { status: "SYNCED", serverBatchId: "confirmed-batch" })
      const resolved = await window.queue.loadOfflineLocalQueue(window.config)
      return { original, retry, stale, resolved }
    })
    expect(result.retry.envelope.events).toEqual([result.original.event])
    expect(result.stale.entries[0].status).toBe("SYNCING")
    expect(result.resolved.entries[0]).toMatchObject({ status: "SYNCED", lastServerBatchId: "confirmed-batch", syncAttempts: 2, event: result.original.event })
  })

  it("keeps conflict evidence and prevents sending newer events out of sequence", async () => {
    const result = await page.evaluate(async () => {
      await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "conflict" } })
      const claim = await window.queue.claimOfflineLocalQueueBatch(window.config)
      if (claim.skipped) throw new Error("Missing claim")
      await window.queue.settleOfflineLocalQueueBatch(window.config, claim, { status: "CONFLICT", serverBatchId: "rejected" })
      await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "newer" } })
      return { claim: await window.queue.claimOfflineLocalQueueBatch(window.config), state: await window.queue.loadOfflineLocalQueue(window.config) }
    })
    expect(result.claim).toMatchObject({ skipped: true, reason: "CONFLICT_REVIEW", pendingCount: 2 })
    expect(result.state.entries).toHaveLength(2)
  })

  it("blocks changed legacy data and detects eviction instead of resurrecting a stale queue", async () => {
    await page.evaluate(async () => {
      await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: {} })
      localStorage.setItem(window.queue.offlineQueueStorageKey(window.config), "old-tab-wrote-new-evidence")
    })
    await expect(page.evaluate(() => window.queue.loadOfflineLocalQueue(window.config))).rejects.toThrow(/quarantined/i)
    await page.evaluate(async () => {
      localStorage.removeItem(window.queue.offlineQueueStorageKey(window.config))
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("aqstoqflow-pos-offline-queue")
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })
    await expect(page.evaluate(() => window.queue.loadOfflineLocalQueue(window.config))).rejects.toThrow(/quarantined/i)
  })

  it("blocks altered payload hashes and changes of cashier-session ownership", async () => {
    await page.evaluate(async () => {
      await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "retained" } })
    })
    await expect(page.evaluate(() => window.queue.loadOfflineLocalQueue({ ...window.config, sessionId: "another-session" }))).rejects.toThrow(/another cashier session/i)
    await page.evaluate(async () => {
      const state = await window.queue.loadOfflineLocalQueue(window.config)
      state.organizationKey = window.config.organizationKey = "corrupt-legacy-org"
      state.entries[0].event.payload = { sale: "changed" }
      localStorage.setItem(window.queue.offlineQueueStorageKey(window.config), JSON.stringify(state))
    })
    await expect(page.evaluate(() => window.queue.loadOfflineLocalQueue(window.config))).rejects.toThrow(/quarantined/i)
  })

  it("survives closing and reopening a persistent browser profile with an unresolved attempt", async () => {
    const profile = mkdtempSync(join(tmpdir(), "stoquify-offline-test-"))
    let persistent: BrowserContext | undefined
    try {
      persistent = await chromium.launchPersistentContext(profile, { headless: true })
      let tab = await openPage(persistent)
      const original = await tab.evaluate(async () => {
        const entry = await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: { sale: "browser-restart" } })
        await window.queue.claimOfflineLocalQueueBatch(window.config)
        return entry
      })
      await persistent.close()
      persistent = await chromium.launchPersistentContext(profile, { headless: true })
      tab = await openPage(persistent)
      const recovered = await tab.evaluate(() => window.queue.claimOfflineLocalQueueBatch({ ...window.config, now: () => new Date(Date.now() + window.queue.OFFLINE_SYNC_LEASE_MS + 1_000) }))
      expect(recovered.skipped).toBe(false)
      if (recovered.skipped) throw new Error("Expected persistent attempt recovery")
      expect(recovered.envelope.events).toEqual([original.event])
    } finally {
      await persistent?.close()
      const absoluteProfile = resolve(profile)
      const expectedPrefix = resolve(tmpdir()) + sep + "stoquify-offline-test-"
      if (!absoluteProfile.startsWith(expectedPrefix)) throw new Error("Refusing unexpected test-profile cleanup path")
      // Windows can briefly retain Chromium log handles after context.close().
      rmSync(absoluteProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
    }
  })

  it("rejects unsupported or denied IndexedDB instead of silently falling back to localStorage", async () => {
    await expect(page.evaluate(() => window.queue.enqueueOfflineLocalEvent({
      ...window.config,
      indexedDB: { open() { throw new DOMException("Storage denied", "SecurityError") } } as unknown as IDBFactory,
    }, { eventType: "OFFLINE_SALE_CAPTURED", payload: {} }))).rejects.toThrow(/Storage denied/)
    expect(await page.evaluate(() => localStorage.getItem(window.queue.offlineQueueStorageKey(window.config)))).toBeNull()
    await expect(page.evaluate(async () => {
      Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined })
      return window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: {} })
    })).rejects.toThrow(/IndexedDB is required/)
  })

  it("does not strand migrated attempts with an invalid or unbounded lease", async () => {
    const result = await page.evaluate(async () => {
      await window.queue.enqueueOfflineLocalEvent(window.config, { eventType: "OFFLINE_SALE_CAPTURED", payload: {} })
      const state = await window.queue.loadOfflineLocalQueue(window.config)
      state.entries[0].status = "SYNCING"
      state.entries[0].syncLeaseExpiresAt = "2099-01-01T00:00:00.000Z"
      return window.queue.offlineLocalQueuePendingEntries(state).map(entry => entry.queueId)
    })
    expect(result).toHaveLength(1)
  })

  it("caps each claim at the server limit and resumes remaining events in sequence", async () => {
    const result = await page.evaluate(async () => {
      const q = window.queue
      const state = await q.loadOfflineLocalQueue(window.config)
      state.organizationKey = window.config.organizationKey = "large-legacy-org"
      let previous: string | null = null
      for (let deviceSeq = 1; deviceSeq <= 251; deviceSeq += 1) {
        const payload = { sale: deviceSeq }
        const payloadHash = await q.sha256Hex(q.stableOfflineJson(payload))
        const entryHash = await q.buildOfflineLocalEventEntryHash({ deviceId: state.deviceId, deviceSeq, eventType: "OFFLINE_SALE_CAPTURED", schemaVersion: 1, payloadHash, prevHash: previous })
        state.entries.push({ queueId: `legacy-${deviceSeq}`, status: "QUEUED", syncAttempts: 0, queuedAt: state.createdAt, updatedAt: state.createdAt,
          event: { eventType: "OFFLINE_SALE_CAPTURED", schemaVersion: 1, deviceSeq, idempotencyKey: `legacy-${deviceSeq}`, payloadHash, prevHash: previous, entryHash, capturedAtDevice: state.createdAt, payload } })
        previous = entryHash
      }
      state.nextSequence = 252
      state.highWaterHash = previous
      localStorage.setItem(q.offlineQueueStorageKey(window.config), JSON.stringify(state))
      const first = await q.claimOfflineLocalQueueBatch(window.config)
      if (first.skipped) throw new Error("Missing first batch")
      await q.settleOfflineLocalQueueBatch(window.config, first, { status: "SYNCED", serverBatchId: "batch-250" })
      const second = await q.claimOfflineLocalQueueBatch(window.config)
      return { first, second }
    })
    expect(result.first.envelope.events).toHaveLength(250)
    expect(result.second.skipped).toBe(false)
    if (result.second.skipped) throw new Error("Missing remainder")
    expect(result.second.envelope.events.map(event => event.deviceSeq)).toEqual([251])
  })
})
