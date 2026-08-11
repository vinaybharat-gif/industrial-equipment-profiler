const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Fallback AI Heuristics Engine (used if Python ML microservice is unreachable)
function calculateFallbackPrediction({ air_temperature, process_temperature, rotational_speed, torque, tool_wear }) {
  let failure_type = 'No Failure';
  let probability = 0.04;
  let health_score = 96.0;
  let is_at_risk = false;
  let recommendation = 'Equipment operating within optimal parameters. No action required.';

  const power = torque * (rotational_speed * (2 * Math.PI / 60));
  const tempDiff = process_temperature - air_temperature;

  if (tool_wear >= 200) {
    failure_type = 'Tool Wear Failure (TWF)';
    probability = 0.89;
    health_score = 20.0;
    is_at_risk = true;
    recommendation = 'Critical: Replace worn tool bit before starting next production run.';
  } else if (tempDiff < 8.6 && rotational_speed < 1380) {
    failure_type = 'Heat Dissipation Failure (HDF)';
    probability = 0.83;
    health_score = 35.0;
    is_at_risk = true;
    recommendation = 'Warning: Inspect thermal cooling system and clean heat exchange vents.';
  } else if (power > 9000 || power < 3500 && rotational_speed > 2800) {
    failure_type = 'Power Failure (PWF)';
    probability = 0.92;
    health_score = 15.0;
    is_at_risk = true;
    recommendation = 'Emergency: Check power supply unit and variable frequency drive for voltage spikes.';
  } else if (torque * tool_wear > 11000) {
    failure_type = 'Overstrain Failure (OSF)';
    probability = 0.78;
    health_score = 42.0;
    is_at_risk = true;
    recommendation = 'Caution: High mechanical load detected. Reduce spindle feed rate.';
  } else if (tool_wear > 120 || torque > 55) {
    failure_type = 'Early Warning';
    probability = 0.45;
    health_score = 68.0;
    is_at_risk = false;
    recommendation = 'Monitor machine closely. Schedule routine maintenance within 48 hours.';
  }

  return { failure_type, probability, health_score, is_at_risk, recommendation };
}

// 1. Health Check
app.get('/', (req, res) => {
  res.json({ status: 'active', message: 'Industrial Equipment Profiler API Running' });
});

// 2. Machine Management Endpoints
app.get('/api/machines', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM machines ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch machines', details: err.message });
  }
});

app.get('/api/machines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const machine = await db.query('SELECT * FROM machines WHERE id = $1', [id]);
    if (machine.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const predictions = await db.query(
      'SELECT * FROM predictions WHERE machine_id = $1 ORDER BY predicted_at DESC LIMIT 10',
      [id]
    );

    const sensorLogs = await db.query(
      'SELECT * FROM sensor_data WHERE machine_id = $1 ORDER BY recorded_at DESC LIMIT 20',
      [id]
    );

    res.json({ 
      details: machine.rows[0], 
      recent_predictions: predictions.rows,
      sensor_history: sensorLogs.rows 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch machine details', details: err.message });
  }
});

// 3. Sensor Telemetry & AI Prediction Endpoint
app.post('/api/sensor-data', async (req, res) => {
  try {
    const { machine_id, air_temperature, process_temperature, rotational_speed, torque, tool_wear } = req.body;

    if (!machine_id) {
      return res.status(400).json({ error: 'machine_id is required' });
    }

    // A. Verify machine exists
    const machineRes = await db.query('SELECT type FROM machines WHERE id = $1', [machine_id]);
    if (machineRes.rows.length === 0) {
      return res.status(404).json({ error: 'Machine ID does not exist' });
    }
    const machineType = machineRes.rows[0].type;

    // B. Insert telemetry log
    const sensorRes = await db.query(
      `INSERT INTO sensor_data (machine_id, air_temperature, process_temperature, rotational_speed, torque, tool_wear)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [machine_id, air_temperature || 298.1, process_temperature || 308.6, rotational_speed || 1500, torque || 40.0, tool_wear || 0]
    );
    const sensorDataId = sensorRes.rows[0].id;

    // C. Get AI Prediction (Python FastAPI or Fallback Engine)
    let aiResult;
    try {
      const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
      const mlResponse = await axios.post(`${mlUrl}/predict`, {
        machine_type: machineType,
        air_temperature: parseFloat(air_temperature),
        process_temperature: parseFloat(process_temperature),
        rotational_speed: parseFloat(rotational_speed),
        torque: parseFloat(torque),
        tool_wear: parseFloat(tool_wear)
      }, { timeout: 3000 });

      aiResult = mlResponse.data;
    } catch (mlErr) {
      console.warn('ML Microservice unreachable. Using local heuristic fallback engine.');
      aiResult = calculateFallbackPrediction({
        air_temperature: parseFloat(air_temperature),
        process_temperature: parseFloat(process_temperature),
        rotational_speed: parseFloat(rotational_speed),
        torque: parseFloat(torque),
        tool_wear: parseFloat(tool_wear)
      });
    }

    const { failure_type, probability, health_score, is_at_risk, recommendation } = aiResult;

    // D. Persist prediction in database
    const predRes = await db.query(
      `INSERT INTO predictions (machine_id, sensor_data_id, failure_type, failure_probability, health_score, is_at_risk, recommendation)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [machine_id, sensorDataId, failure_type, probability, health_score, is_at_risk, recommendation]
    );

    // E. Update machine status based on health score
    let newStatus = 'HEALTHY';
    if (health_score < 40.0) newStatus = 'CRITICAL';
    else if (health_score < 75.0) newStatus = 'WARNING';

    await db.query('UPDATE machines SET health_score = $1, status = $2 WHERE id = $3', [
      health_score,
      newStatus,
      machine_id
    ]);

    res.status(201).json({
      message: 'Telemetry logged and AI prediction generated successfully',
      prediction: predRes.rows[0],
      updated_status: newStatus
    });

  } catch (err) {
    console.error('Pipeline error:', err.message);
    res.status(500).json({ error: 'Sensor pipeline failed', details: err.message });
  }
});

// 4. Analytics Summary Endpoint
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const total = await db.query('SELECT COUNT(*) FROM machines');
    const healthy = await db.query("SELECT COUNT(*) FROM machines WHERE status = 'HEALTHY'");
    const warning = await db.query("SELECT COUNT(*) FROM machines WHERE status = 'WARNING'");
    const critical = await db.query("SELECT COUNT(*) FROM machines WHERE status = 'CRITICAL'");

    res.json({
      total_machines: parseInt(total.rows[0].count),
      healthy_machines: parseInt(healthy.rows[0].count),
      warning_machines: parseInt(warning.rows[0].count),
      critical_machines: parseInt(critical.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary', details: err.message });
  }
});

// 5. Maintenance Tickets Endpoint
app.get('/api/maintenance', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, mac.name as machine_name 
       FROM maintenance_logs m 
       LEFT JOIN machines mac ON m.machine_id = mac.id 
       ORDER BY m.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch maintenance logs', details: err.message });
  }
});

app.post('/api/maintenance', async (req, res) => {
  try {
    const { machine_id, assigned_to, title, description, scheduled_date } = req.body;
    const { rows } = await db.query(
      `INSERT INTO maintenance_logs (machine_id, assigned_to, title, description, scheduled_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [machine_id, assigned_to || null, title, description, scheduled_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create maintenance ticket', details: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Core REST API running on port ${PORT}`);
});