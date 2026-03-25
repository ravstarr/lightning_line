/**
 * Weighted Fair Queuing (WFQ) Queue Management System
 * - 2:1 priority-to-standard serving ratio
 * - Aging: priority tickets gain weight over time to prevent re-starvation
 * - ML wait-time predictor scaffold (Scikit-Learn would run on your Python service;
 *   this module calls that endpoint and falls back to a weighted rolling average)
 */
 
'use strict';
 
// ─── Constants ────────────────────────────────────────────────────────────────
 
const PRIORITY_AGE_THRESHOLD = 55;   // years old → priority queue
const WFQ_RATIO = 2;                 // serve N priority tickets before 1 standard
const AGING_INTERVAL_MS = 60_000;   // boost waiting priority tickets every 60 s
const AGING_WEIGHT_INCREMENT = 0.1; // weight boost per aging tick
const ML_ENDPOINT = process.env.ML_ENDPOINT || 'http://localhost:5000/predict';
 
// ─── Ticket Factory ───────────────────────────────────────────────────────────
 
let _ticketSeq = 1;
 
/**
 * @param {object} opts
 * @param {number} opts.age          - citizen age
 * @param {string} opts.serviceType  - e.g. 'property_tax' | 'doc_pickup' | 'motor_vehicle'
 * @param {string} [opts.branch]     - service branch / counter id
 * @returns {object} ticket
 */
function createTicket({ age, serviceType, branch = 'general' }) {
  return {
    id: _ticketSeq++,
    age,
    serviceType,
    branch,
    isPriority: age >= PRIORITY_AGE_THRESHOLD,
    weight: 1.0,           // starts at 1; bumped by aging
    enqueuedAt: Date.now(),
    estimatedWait: null,   // filled in by predictWaitTime()
  };
}
 
// ─── Queue Implementation ─────────────────────────────────────────────────────
 
class WFQueueManager {
  constructor() {
    this.priorityQueue = [];    // tickets for 55+ citizens
    this.standardQueue = [];    // tickets for all others
    this._serveCounter = 0;     // tracks how many priority tickets served in current cycle
    this._agingTimer = null;
    this._staffDelayedBranches = new Set(); // branches marked 'Delayed' by staff
  }
 
  // ── Enqueue ────────────────────────────────────────────────────────────────
 
  async enqueue(ticket) {
    ticket.estimatedWait = await predictWaitTime(ticket, this);
 
    if (ticket.isPriority) {
      this.priorityQueue.push(ticket);
      // Sort by weight desc (higher weight = served sooner)
      this.priorityQueue.sort((a, b) => b.weight - a.weight);
    } else {
      this.standardQueue.push(ticket);
    }
 
    console.log(
      `[ENQUEUE] Ticket #${ticket.id} → ${ticket.isPriority ? 'PRIORITY' : 'STANDARD'} | ` +
      `EWT: ${ticket.estimatedWait}s`
    );
    return ticket;
  }
 
  // ── Dequeue (WFQ Core) ─────────────────────────────────────────────────────
 
  /**
   * Returns the next ticket to serve, honouring the 2:1 WFQ ratio.
   * Falls back to whichever queue is non-empty if the other is exhausted.
   */
  dequeue() {
    const hasPriority = this.priorityQueue.length > 0;
    const hasStandard = this.standardQueue.length > 0;
 
    if (!hasPriority && !hasStandard) return null;
 
    let ticket;
 
    if (hasPriority && (!hasStandard || this._serveCounter < WFQ_RATIO)) {
      // Serve from priority queue
      ticket = this.priorityQueue.shift();
      this._serveCounter++;
    } else {
      // Serve one standard ticket, then reset the priority cycle
      ticket = this.standardQueue.shift();
      this._serveCounter = 0;
    }
 
    const waitedMs = Date.now() - ticket.enqueuedAt;
    console.log(
      `[SERVE] Ticket #${ticket.id} (${ticket.isPriority ? 'priority' : 'standard'}) ` +
      `→ waited ${(waitedMs / 1000).toFixed(1)}s`
    );
    return ticket;
  }
 
  // ── Aging (anti-starvation for priority queue) ─────────────────────────────
 
  /**
   * Call once on startup. Every AGING_INTERVAL_MS the weight of every waiting
   * priority ticket increases, so a large arriving batch cannot permanently
   * deprive latecomers of earlier placement.
   */
  startAgingTimer() {
    this._agingTimer = setInterval(() => {
      if (this.priorityQueue.length === 0) return;
      this.priorityQueue.forEach(t => { t.weight += AGING_WEIGHT_INCREMENT; });
      // Re-sort after weight bump
      this.priorityQueue.sort((a, b) => b.weight - a.weight);
      console.log(`[AGING] Priority queue weights bumped (+${AGING_WEIGHT_INCREMENT})`);
    }, AGING_INTERVAL_MS);
  }
 
  stopAgingTimer() {
    if (this._agingTimer) clearInterval(this._agingTimer);
  }
 
  // ── Staff delay injection ──────────────────────────────────────────────────
 
  /**
   * Staff call this when they mark themselves 'Delayed' on the dashboard.
   * The ML predictor reads _staffDelayedBranches when estimating wait times.
   */
  setStaffDelay(branch, isDelayed) {
    if (isDelayed) {
      this._staffDelayedBranches.add(branch);
      console.log(`[STAFF] Branch "${branch}" marked DELAYED`);
    } else {
      this._staffDelayedBranches.delete(branch);
      console.log(`[STAFF] Branch "${branch}" delay cleared`);
    }
  }
 
  isDelayed(branch) {
    return this._staffDelayedBranches.has(branch);
  }
 
  // ── Introspection helpers ──────────────────────────────────────────────────
 
  queueLengths() {
    return {
      priority: this.priorityQueue.length,
      standard: this.standardQueue.length,
    };
  }
 
  allTickets() {
    return [...this.priorityQueue, ...this.standardQueue];
  }
}
 
// ─── ML Wait-Time Predictor ───────────────────────────────────────────────────
 
/**
 * Service complexity weights — heavier services take longer.
 * Your Scikit-Learn model uses these same weights as a feature.
 */
const SERVICE_COMPLEXITY = {
  doc_pickup:       0.5,
  simple_query:     0.6,
  property_tax:     1.4,
  motor_vehicle:    1.6,
  business_license: 1.3,
  default:          1.0,
};
 
/**
 * Calls the Python ML microservice for an EWT estimate.
 * Falls back to a simple weighted average if the service is unreachable.
 *
 * Features sent to the model:
 *   - hour_of_day, day_of_week   (time-of-day / day patterns)
 *   - service_complexity         (weighted by service type)
 *   - queue_length               (current backlog)
 *   - staff_delayed              (live staff status for this branch)
 *
 * @param {object}         ticket
 * @param {WFQueueManager} manager
 * @returns {Promise<number>} estimated wait in seconds
 */
async function predictWaitTime(ticket, manager) {
  const now = new Date();
  const features = {
    hour_of_day:        now.getHours(),
    day_of_week:        now.getDay(),          // 0 = Sun … 6 = Sat
    service_complexity: SERVICE_COMPLEXITY[ticket.serviceType] ?? SERVICE_COMPLEXITY.default,
    queue_length:       manager.allTickets().length,
    staff_delayed:      manager.isDelayed(ticket.branch) ? 1 : 0,
    is_priority:        ticket.isPriority ? 1 : 0,
  };
 
  try {
    const res = await fetch(ML_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
      signal: AbortSignal.timeout(2000), // 2-second timeout
    });
    if (!res.ok) throw new Error(`ML service ${res.status}`);
    const { estimated_wait_seconds } = await res.json();
    return Math.round(estimated_wait_seconds);
  } catch (err) {
    // Fallback: weighted rolling average baseline
    console.warn(`[ML] Falling back to heuristic (${err.message})`);
    return heuristicWait(features);
  }
}
 
/**
 * Simple heuristic fallback — not a replacement for the ML model,
 * just a safety net so the queue keeps working if the ML service is down.
 */
function heuristicWait(features) {
  const BASE_SECONDS = 300; // 5 min base
  const queuePressure = features.queue_length * 90;
  const complexity    = features.service_complexity * 120;
  const staffPenalty  = features.staff_delayed * 600; // +10 min if staff delayed
  const peakHour      = (features.hour_of_day >= 9 && features.hour_of_day <= 11) ? 180 : 0;
  return Math.round(BASE_SECONDS + queuePressure + complexity + staffPenalty + peakHour);
}
 
// ─── Exports ──────────────────────────────────────────────────────────────────
 
module.exports = { WFQueueManager, createTicket, predictWaitTime };
 
// ─── Quick demo (run directly: node wfqQueue.js) ──────────────────────────────
 
if (require.main === module) {
  (async () => {
    const manager = new WFQueueManager();
    manager.startAgingTimer();
 
    // Mix of citizens
    const arrivals = [
      { age: 28, serviceType: 'doc_pickup',    branch: 'counter_1' },
      { age: 62, serviceType: 'property_tax',  branch: 'counter_2' },
      { age: 35, serviceType: 'motor_vehicle', branch: 'counter_1' },
      { age: 70, serviceType: 'doc_pickup',    branch: 'counter_2' },
      { age: 45, serviceType: 'simple_query',  branch: 'counter_1' },
      { age: 58, serviceType: 'property_tax',  branch: 'counter_2' },
    ];
 
    console.log('\n=== Enqueuing tickets ===');
    for (const a of arrivals) {
      await manager.enqueue(createTicket(a));
    }
 
    // Simulate counter_2 staff marking themselves Delayed
    manager.setStaffDelay('counter_2', true);
 
    console.log('\n=== Queue lengths ===', manager.queueLengths());
 
    console.log('\n=== Serving tickets (WFQ 2:1 ratio) ===');
    let next;
    while ((next = manager.dequeue()) !== null) {
      console.log(
        `  → Serving #${next.id} | age ${next.age} | ${next.serviceType} | EWT was ${next.estimatedWait}s`
      );
    }
 
    manager.stopAgingTimer();
    console.log('\nDone.');
  })();
}