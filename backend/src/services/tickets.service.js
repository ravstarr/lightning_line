const pool = require("../../db/connection");

const PRIORITY_WEIGHTS = {
  ELDERLY: 1,
  DISABLED: 1,
  PREGNANT: 1,
  CIVIL_SERVANT: 2,
  EXPRESS: 2,
  REGULAR: 3
};

function detectPriorityType(birthYear, priorityType) {
  if (priorityType) return priorityType;

  if (!birthYear) return "REGULAR";

  const age = new Date().getFullYear() - Number(birthYear);

  return age >= 55 ? "ELDERLY" : "REGULAR";
}

async function generateTicketNumber(serviceId) {
  const serviceResult = await pool.query(
    "SELECT code FROM services WHERE id = $1",
    [serviceId]
  );

  const code = serviceResult.rows[0]?.code || "QUEUE";
  const prefix = code.charAt(0);

  const countResult = await pool.query("SELECT COUNT(*) FROM tickets");
  const nextNumber = Number(countResult.rows[0].count) + 1;

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

async function calculateEstimatedWait(serviceId, branchId) {
  const serviceResult = await pool.query(
    "SELECT average_service_minutes FROM services WHERE id = $1",
    [serviceId]
  );

  const averageMinutes = serviceResult.rows[0]?.average_service_minutes || 10;

  const waitingResult = await pool.query(
    `SELECT COUNT(*) 
     FROM tickets 
     WHERE branch_id = $1 
     AND status = 'WAITING'`,
    [branchId]
  );

  const waitingCount = Number(waitingResult.rows[0].count);

  return waitingCount * averageMinutes;
}

async function createTicket(data) {
  const {
    customerName,
    trn,
    birthYear,
    phoneNumber,
    branchId,
    serviceId,
    priorityType
  } = data;

  if (!branchId || !serviceId) {
    throw new Error("branchId and serviceId are required");
  }

  const finalPriorityType = detectPriorityType(birthYear, priorityType);
  const ticketNumber = await generateTicketNumber(serviceId);
  const estimatedWaitMinutes = await calculateEstimatedWait(serviceId, branchId);

  const result = await pool.query(
    `INSERT INTO tickets (
      ticket_number,
      customer_name,
      trn,
      birth_year,
      phone_number,
      branch_id,
      service_id,
      priority_type,
      estimated_wait_minutes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      ticketNumber,
      customerName || null,
      trn || null,
      birthYear || null,
      phoneNumber || null,
      branchId,
      serviceId,
      finalPriorityType,
      estimatedWaitMinutes
    ]
  );

  return result.rows[0];
}

async function getQueue(branchId) {
  const params = [];
  let branchFilter = "";

  if (branchId) {
    params.push(branchId);
    branchFilter = "AND t.branch_id = $1";
  }

  const result = await pool.query(
    `SELECT 
      t.*,
      s.name AS service_name,
      b.name AS branch_name,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE t.priority_type
            WHEN 'ELDERLY' THEN 1
            WHEN 'DISABLED' THEN 1
            WHEN 'PREGNANT' THEN 1
            WHEN 'CIVIL_SERVANT' THEN 2
            WHEN 'EXPRESS' THEN 2
            ELSE 3
          END,
          t.created_at ASC
      ) AS queue_position
    FROM tickets t
    JOIN services s ON t.service_id = s.id
    JOIN branches b ON t.branch_id = b.id
    WHERE t.status = 'WAITING'
    ${branchFilter}
    ORDER BY queue_position`,
    params
  );

  return result.rows;
}

async function getTicketById(id) {
  const result = await pool.query(
    `SELECT 
      t.*,
      s.name AS service_name,
      b.name AS branch_name
    FROM tickets t
    JOIN services s ON t.service_id = s.id
    JOIN branches b ON t.branch_id = b.id
    WHERE t.id = $1`,
    [id]
  );

  return result.rows[0];
}

async function callNext(data = {}) {
  const branchId = data.branchId || 1;
  const counterId = data.counterId || null;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let counterResult;

    if (counterId) {
      counterResult = await client.query(
        `SELECT * FROM counters
         WHERE id = $1
         AND branch_id = $2
         AND status = 'AVAILABLE'
         FOR UPDATE`,
        [counterId, branchId]
      );
    } else {
      counterResult = await client.query(
        `SELECT * FROM counters
         WHERE branch_id = $1
         AND status = 'AVAILABLE'
         ORDER BY id
         LIMIT 1
         FOR UPDATE`,
        [branchId]
      );
    }

    if (counterResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { message: "No available counter found" };
    }

    const counter = counterResult.rows[0];

    const ticketResult = await client.query(
      `SELECT *
       FROM tickets
       WHERE branch_id = $1
       AND status = 'WAITING'
       ORDER BY
         CASE priority_type
           WHEN 'ELDERLY' THEN 1
           WHEN 'DISABLED' THEN 1
           WHEN 'PREGNANT' THEN 1
           WHEN 'CIVIL_SERVANT' THEN 2
           WHEN 'EXPRESS' THEN 2
           ELSE 3
         END,
         created_at ASC
       LIMIT 1
       FOR UPDATE`,
      [branchId]
    );

    if (ticketResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { message: "No tickets waiting" };
    }

    const ticket = ticketResult.rows[0];

    const updatedTicket = await client.query(
      `UPDATE tickets
       SET status = 'CALLED',
           called_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [ticket.id]
    );

    const updatedCounter = await client.query(
      `UPDATE counters
       SET status = 'SERVING',
           current_ticket_id = $1
       WHERE id = $2
       RETURNING *`,
      [ticket.id, counter.id]
    );

    await client.query("COMMIT");

    return {
      message: "Next customer called",
      ticket: updatedTicket.rows[0],
      counter: updatedCounter.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function completeTicket(id) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ticketResult = await client.query(
      `UPDATE tickets
       SET status = 'COMPLETED',
           completed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE counters
       SET status = 'AVAILABLE',
           current_ticket_id = NULL
       WHERE current_ticket_id = $1`,
      [id]
    );

    await client.query("COMMIT");

    return ticketResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function delayTicket(id) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ticketResult = await client.query(
      `UPDATE tickets
       SET status = 'WAITING',
           created_at = NOW(),
           called_at = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE counters
       SET status = 'AVAILABLE',
           current_ticket_id = NULL
       WHERE current_ticket_id = $1`,
      [id]
    );

    await client.query("COMMIT");

    return ticketResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updatePriority(id, data) {
  const result = await pool.query(
    `UPDATE tickets
     SET priority_type = $1
     WHERE id = $2
     RETURNING *`,
    [data.priorityType, id]
  );

  return result.rows[0];
}

module.exports = {
  createTicket,
  getQueue,
  getTicketById,
  callNext,
  completeTicket,
  delayTicket,
  updatePriority
};