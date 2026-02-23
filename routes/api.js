const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../database");

// SYNC API

// Sync data dari Random User API
router.post("/sync", async (req, res) => {
  try {
    const count = req.body.count || 50;
    const response = await axios.get(
      `https://randomuser.me/api/?results=${count}`,
    );
    const users = response.data.results;

    let recordsAdded = 0;
    let recordsUpdated = 0;

    for (const user of users) {
      const existingUser = await db.get("SELECT id FROM users WHERE uuid = ?", [
        user.login.uuid,
      ]);

      if (existingUser) {
        // Update existing user
        await db.run(
          `
                    UPDATE users SET
                        gender = ?, title = ?, first_name = ?, last_name = ?,
                        email = ?, phone = ?, cell = ?, date_of_birth = ?,
                        age = ?, nationality = ?, city = ?, state = ?,
                        country = ?, postcode = ?, picture_large = ?,
                        picture_medium = ?, picture_thumbnail = ?,
                        registered_date = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE uuid = ?
                `,
          [
            user.gender,
            user.name.title,
            user.name.first,
            user.name.last,
            user.email,
            user.phone,
            user.cell,
            user.dob.date.split("T")[0],
            user.dob.age,
            user.nat,
            user.location.city,
            user.location.state,
            user.location.country,
            user.location.postcode,
            user.picture.large,
            user.picture.medium,
            user.picture.thumbnail,
            user.registered.date.split("T")[0],
            user.login.uuid,
          ],
        );
        recordsUpdated++;
      } else {
        // Insert new user
        await db.run(
          `
                    INSERT INTO users (
                        uuid, gender, title, first_name, last_name, email,
                        phone, cell, date_of_birth, age, nationality, city,
                        state, country, postcode, picture_large, picture_medium,
                        picture_thumbnail, registered_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
          [
            user.login.uuid,
            user.gender,
            user.name.title,
            user.name.first,
            user.name.last,
            user.email,
            user.phone,
            user.cell,
            user.dob.date.split("T")[0],
            user.dob.age,
            user.nat,
            user.location.city,
            user.location.state,
            user.location.country,
            user.location.postcode,
            user.picture.large,
            user.picture.medium,
            user.picture.thumbnail,
            user.registered.date.split("T")[0],
          ],
        );
        recordsAdded++;
      }
    }

    // Catat sync log dengan waktu lokal
    const localTime = new Date().toISOString();
    await db.run(
      `
            INSERT INTO sync_log (sync_time, records_added, records_updated, status)
            VALUES (?, ?, ?, 'success')
        `,
      [localTime, recordsAdded, recordsUpdated],
    );

    res.json({
      success: true,
      message: "Sinkronisasi berhasil",
      recordsAdded,
      recordsUpdated,
      syncTime: localTime,
    });
  } catch (error) {
    console.error("Error sync:", error);
    await db.run(`
            INSERT INTO sync_log (status) VALUES ('failed')
        `);
    res
      .status(500)
      .json({ success: false, message: "Gagal sinkronisasi data" });
  }
});

// Get last sync time
router.get("/sync/last", async (req, res) => {
  try {
    const lastSync = await db.get(`
            SELECT * FROM sync_log ORDER BY sync_time DESC LIMIT 1
        `);
    res.json(lastSync || { message: "Belum ada sinkronisasi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD USERS

// Get all users dengan filter, sorting, dan pagination
router.get("/users", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "updated_at",
      sortOrder = "DESC",
      search = "",
      gender = "",
      nationality = "",
      startDate = "",
      endDate = "",
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Filter pencarian
    if (search) {
      whereConditions.push(
        `(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR city LIKE ?)`,
      );
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Filter gender
    if (gender) {
      whereConditions.push("gender = ?");
      params.push(gender);
    }

    // Filter nationality
    if (nationality) {
      whereConditions.push("nationality = ?");
      params.push(nationality);
    }

    // Filter tanggal
    if (startDate) {
      whereConditions.push("registered_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push("registered_date <= ?");
      params.push(endDate);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    // Validasi kolom sorting
    const allowedSortColumns = [
      "id",
      "first_name",
      "last_name",
      "email",
      "gender",
      "age",
      "nationality",
      "city",
      "country",
      "registered_date",
      "updated_at",
      "created_at",
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy)
      ? sortBy
      : "updated_at";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Query data
    const users = await db.all(
      `
            SELECT * FROM users ${whereClause}
            ORDER BY ${safeSortBy} ${safeSortOrder}
            LIMIT ? OFFSET ?
        `,
      [...params, parseInt(limit), parseInt(offset)],
    );

    // Count total
    const countResult = await db.get(
      `
            SELECT COUNT(*) as total FROM users ${whereClause}
        `,
      params,
    );

    res.json({
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error("Error get users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single user
router.get("/users/:id", async (req, res) => {
  try {
    const user = await db.get("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
router.post("/users", async (req, res) => {
  try {
    const {
      gender,
      title,
      first_name,
      last_name,
      email,
      phone,
      cell,
      date_of_birth,
      age,
      nationality,
      city,
      state,
      country,
      postcode,
      registered_date,
    } = req.body;

    // Generate UUID
    const uuid =
      "manual-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

    const result = await db.run(
      `
            INSERT INTO users (
                uuid, gender, title, first_name, last_name, email,
                phone, cell, date_of_birth, age, nationality, city,
                state, country, postcode, registered_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        uuid,
        gender,
        title,
        first_name,
        last_name,
        email,
        phone,
        cell,
        date_of_birth,
        age,
        nationality,
        city,
        state,
        country,
        postcode,
        registered_date,
      ],
    );

    const newUser = await db.get("SELECT * FROM users WHERE id = ?", [
      result.lastID,
    ]);
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error create user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put("/users/:id", async (req, res) => {
  try {
    const {
      gender,
      title,
      first_name,
      last_name,
      email,
      phone,
      cell,
      date_of_birth,
      age,
      nationality,
      city,
      state,
      country,
      postcode,
      registered_date,
    } = req.body;

    await db.run(
      `
            UPDATE users SET
                gender = ?, title = ?, first_name = ?, last_name = ?,
                email = ?, phone = ?, cell = ?, date_of_birth = ?,
                age = ?, nationality = ?, city = ?, state = ?,
                country = ?, postcode = ?, registered_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `,
      [
        gender,
        title,
        first_name,
        last_name,
        email,
        phone,
        cell,
        date_of_birth,
        age,
        nationality,
        city,
        state,
        country,
        postcode,
        registered_date,
        req.params.id,
      ],
    );

    const updatedUser = await db.get("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (!updatedUser) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error("Error update user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    const result = await db.run("DELETE FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (result.changes === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    res.json({ success: true, message: "User berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DASHBOARD & ANALYTICS

// Get dashboard statistics
router.get("/dashboard/stats", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    let params = [];

    if (startDate && endDate) {
      dateFilter = "WHERE registered_date BETWEEN ? AND ?";
      params = [startDate, endDate];
    } else {
      // Default: 1 bulan terakhir
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      dateFilter = "WHERE registered_date >= ?";
      params = [oneMonthAgo.toISOString().split("T")[0]];
    }

    // Total users
    const totalUsers = await db.get(
      `SELECT COUNT(*) as count FROM users ${dateFilter}`,
      params,
    );

    // Gender distribution
    const genderDist = await db.all(
      `
            SELECT gender, COUNT(*) as count 
            FROM users ${dateFilter}
            GROUP BY gender
        `,
      params,
    );

    // Nationality distribution
    const nationalityDist = await db.all(
      `
            SELECT nationality, COUNT(*) as count 
            FROM users ${dateFilter}
            GROUP BY nationality
            ORDER BY count DESC
            LIMIT 10
        `,
      params,
    );

    // Age distribution
    const ageDist = await db.all(
      `
            SELECT 
                CASE 
                    WHEN age < 20 THEN '< 20'
                    WHEN age BETWEEN 20 AND 29 THEN '20-29'
                    WHEN age BETWEEN 30 AND 39 THEN '30-39'
                    WHEN age BETWEEN 40 AND 49 THEN '40-49'
                    WHEN age BETWEEN 50 AND 59 THEN '50-59'
                    ELSE '60+'
                END as age_group,
                COUNT(*) as count
            FROM users ${dateFilter}
            GROUP BY age_group
            ORDER BY age_group
        `,
      params,
    );

    // Registrations per date (for column chart)
    const registrationsPerDate = await db.all(
      `
            SELECT registered_date, COUNT(*) as count
            FROM users ${dateFilter}
            GROUP BY registered_date
            ORDER BY registered_date
        `,
      params,
    );

    // Country distribution
    const countryDist = await db.all(
      `
            SELECT country, COUNT(*) as count 
            FROM users ${dateFilter}
            GROUP BY country
            ORDER BY count DESC
            LIMIT 10
        `,
      params,
    );

    res.json({
      totalUsers: totalUsers.count,
      genderDistribution: genderDist,
      nationalityDistribution: nationalityDist,
      ageDistribution: ageDist,
      registrationsPerDate,
      countryDistribution: countryDist,
    });
  } catch (error) {
    console.error("Error get dashboard stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get filter options
router.get("/filters/options", async (req, res) => {
  try {
    const genders = await db.all(
      "SELECT DISTINCT gender FROM users WHERE gender IS NOT NULL",
    );
    const nationalities = await db.all(
      "SELECT DISTINCT nationality FROM users WHERE nationality IS NOT NULL ORDER BY nationality",
    );
    const countries = await db.all(
      "SELECT DISTINCT country FROM users WHERE country IS NOT NULL ORDER BY country",
    );

    res.json({
      genders: genders.map((g) => g.gender),
      nationalities: nationalities.map((n) => n.nationality),
      countries: countries.map((c) => c.country),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
