const db = require("../config/db")

/* ======================================================
   ENERGY SIMULATION SERVICE
   Generates hourly cumulative energy readings
====================================================== */

class EnergySimulator {
  constructor() {
    this.isRunning = false
  }

  /* ======================================================
     GET SIMULATION RULES FROM DATABASE
  ====================================================== */
  getSimulationRules(callback) {
    const sql = `
      SELECT * FROM simulation_rules
      ORDER BY consumer_type, time_range
    `
    db.query(sql, callback)
  }

  /* ======================================================
     CHECK IF TODAY IS A HOLIDAY
  ====================================================== */
  isHoliday(date, callback) {
    const dateStr = date.toISOString().split('T')[0]
    const sql = `
      SELECT COUNT(*) as count FROM holiday_config
      WHERE date = ?
    `
    db.query(sql, [dateStr], (err, results) => {
      if (err) return callback(err)
      callback(null, results[0].count > 0)
    })
  }

  /* ======================================================
     GET TIME CATEGORY (Morning/Day/Evening/Night)
  ====================================================== */
  getTimeCategory(hour) {
    if (hour >= 6 && hour < 9) return 'MORNING'
    if (hour >= 9 && hour < 17) return 'DAY'
    if (hour >= 17 && hour < 22) return 'EVENING'
    return 'NIGHT'
  }

  /* ======================================================
     GET DAY TYPE (Weekday/Weekend)
  ====================================================== */
  getDayType(date) {
    const day = date.getDay()
    return (day === 0 || day === 6) ? 'WEEKEND' : 'WEEKDAY'
  }

  /* ======================================================
     CALCULATE HOURLY CONSUMPTION
  ====================================================== */
  calculateHourlyConsumption(consumerType, hour, dayType, isHolidayDay, rules) {
    // Find matching rule
    const timeCategory = this.getTimeCategory(hour)
    
    let baseUnits = 0.5 // Default
    let multiplier = 1.0

    // Find rule for this consumer type and time
    const rule = rules.find(r => 
      r.consumer_type === consumerType &&
      r.time_range.includes(timeCategory)
    )

    if (rule) {
      baseUnits = parseFloat(rule.base_units)
      multiplier = parseFloat(rule.multiplier)
    }

    // Adjust for weekends/holidays
    if (consumerType === 'DOMESTIC') {
      if (dayType === 'WEEKEND' || isHolidayDay) {
        multiplier *= 1.3 // 30% more usage
      }
    } else if (consumerType === 'COMMERCIAL') {
      if (dayType === 'WEEKEND' || isHolidayDay) {
        multiplier *= 0.2 // 80% less usage
      }
    }

    // Add some randomness (±20%)
    const randomFactor = 0.8 + (Math.random() * 0.4)
    
    return baseUnits * multiplier * randomFactor
  }

  /* ======================================================
     GET LATEST READING FOR A METER
  ====================================================== */
  getLatestReading(meterId, callback) {
    const sql = `
      SELECT cumulative_units, reading_date
      FROM energy_readings
      WHERE meter_id = ?
      ORDER BY reading_date DESC
      LIMIT 1
    `
    db.query(sql, [meterId], callback)
  }

  /* ======================================================
     INSERT NEW ENERGY READING
  ====================================================== */
  insertReading(meterId, cumulativeUnits, timestamp, callback) {
    const sql = `
      INSERT INTO energy_readings 
      (meter_id, cumulative_units, data_source, reading_date, created_at)
      VALUES (?, ?, 'SIMULATION', ?, NOW())
    `
    db.query(sql, [meterId, cumulativeUnits, timestamp], callback)
  }

  /* ======================================================
     GENERATE READINGS FOR ALL ACTIVE METERS
  ====================================================== */
  generateReadings() {
    if (this.isRunning) {
      console.log("⏸️  Simulation already running, skipping...")
      return
    }

    this.isRunning = true
    console.log("⚡ Starting energy simulation...")

    const now = new Date()
    const currentHour = now.getHours()
    const dayType = this.getDayType(now)

    // Get all simulation rules first
    this.getSimulationRules((err, rules) => {
      if (err) {
        console.error("❌ Error fetching simulation rules:", err)
        this.isRunning = false
        return
      }

      // Check if today is a holiday
      this.isHoliday(now, (err, isHolidayDay) => {
        if (err) {
          console.error("❌ Error checking holiday:", err)
          this.isRunning = false
          return
        }

        // Get all active EB consumers
        const sql = `
          SELECT meter_id, consumer_type 
          FROM eb_consumers
          WHERE status = 'ACTIVE'
        `

        db.query(sql, (err, consumers) => {
          if (err) {
            console.error("❌ Error fetching consumers:", err)
            this.isRunning = false
            return
          }

          console.log(`📊 Processing ${consumers.length} meters...`)

          let processed = 0
          let errors = 0

          consumers.forEach((consumer) => {
            // Get latest reading for this meter
            this.getLatestReading(consumer.meter_id, (err, readings) => {
              if (err) {
                console.error(`❌ Error fetching reading for ${consumer.meter_id}:`, err)
                errors++
                processed++
                this.checkCompletion(processed, consumers.length, errors)
                return
              }

              let cumulativeUnits = 0

              if (readings.length > 0) {
                // Add to existing cumulative
                const hourlyConsumption = this.calculateHourlyConsumption(
                  consumer.consumer_type,
                  currentHour,
                  dayType,
                  isHolidayDay,
                  rules
                )
                cumulativeUnits = parseFloat(readings[0].cumulative_units) + hourlyConsumption
              } else {
                // First reading - start from a realistic base
                cumulativeUnits = 100 + Math.random() * 500
              }

              // Insert new reading
              this.insertReading(
                consumer.meter_id,
                cumulativeUnits.toFixed(2),
                now,
                (err) => {
                  if (err) {
                    console.error(`❌ Error inserting reading for ${consumer.meter_id}:`, err)
                    errors++
                  }
                  processed++
                  this.checkCompletion(processed, consumers.length, errors)
                }
              )
            })
          })
        })
      })
    })
  }

  /* ======================================================
     CHECK IF ALL METERS PROCESSED
  ====================================================== */
  checkCompletion(processed, total, errors) {
    if (processed === total) {
      console.log(`✅ Simulation complete: ${total - errors} success, ${errors} errors`)
      this.isRunning = false
    }
  }

  /* ======================================================
     START AUTOMATIC SIMULATION (HOURLY)
  ====================================================== */
  startAutoSimulation(intervalMinutes = 60) {
    console.log(`🚀 Energy simulation started (every ${intervalMinutes} minutes)`)
    
    // Run immediately on start
    this.generateReadings()

    // Then run on schedule
    setInterval(() => {
      this.generateReadings()
    }, intervalMinutes * 60 * 1000)
  }
}

module.exports = new EnergySimulator()