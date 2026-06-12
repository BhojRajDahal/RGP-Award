import { connectToDatabase } from '../config/db.js';
import { safeLimitOffset } from '../utils/pagination.js';

// Create a new mark
export const createMark = async (application_id, admin_id, marks, remarks = null) => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            INSERT INTO application_marks (application_id, admin_id, marks, remarks)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await pool.execute(sql, [application_id, admin_id, marks, remarks]);
        
        // Fetch and return the created mark
        const selectSql = `
            SELECT mark_id, application_id, admin_id, marks, is_winner, remarks, created_at
            FROM application_marks
            WHERE mark_id = ?
        `;
        const [rows] = await pool.execute(selectSql, [result.insertId]);
        return rows[0];
    } catch (error) {
        throw new Error(`Failed to create mark: ${error.message}`);
    }
};

// Get marks by application ID
export const getMarksByApplicationId = async (application_id) => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            SELECT m.*, a.full_name as admin_name, a.email as admin_email
            FROM application_marks m
            LEFT JOIN admin a ON m.admin_id = a.aid
            WHERE m.application_id = ?
            ORDER BY m.created_at DESC
        `;
        const [rows] = await pool.execute(sql, [application_id]);
        return rows;
    } catch (error) {
        throw new Error(`Failed to fetch marks: ${error.message}`);
    }
};

// Get mark by ID
export const getMarkById = async (mark_id) => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            SELECT m.*, a.full_name as admin_name, a.email as admin_email
            FROM application_marks m
            LEFT JOIN admin a ON m.admin_id = a.aid
            WHERE m.mark_id = ?
        `;
        const [rows] = await pool.execute(sql, [mark_id]);
        return rows[0];
    } catch (error) {
        throw new Error(`Failed to fetch mark: ${error.message}`);
    }
};

// Update mark
export const updateMark = async (mark_id, marks, remarks = null) => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            UPDATE application_marks
            SET marks = ?, remarks = ?
            WHERE mark_id = ?
        `;
        await pool.execute(sql, [marks, remarks, mark_id]);
        
        // Fetch and return the updated mark
        return await getMarkById(mark_id);
    } catch (error) {
        throw new Error(`Failed to update mark: ${error.message}`);
    }
};

export const updateWinnerStatus = async (mark_id, is_winner) => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            UPDATE application_marks
            SET is_winner = ?
            WHERE mark_id = ?
        `;
        await pool.execute(sql, [is_winner ? 1 : 0, mark_id]);

        return await getMarkById(mark_id);
    } catch (error) {
        throw new Error(`Failed to update winner status: ${error.message}`);
    }
};

// Delete mark
export const deleteMark = async (mark_id) => {
    try {
        const pool = await connectToDatabase();
        const sql = `DELETE FROM application_marks WHERE mark_id = ?`;
        await pool.execute(sql, [mark_id]);
        return true;
    } catch (error) {
        throw new Error(`Failed to delete mark: ${error.message}`);
    }
};

/** Application IDs that already have at least one row in `application_marks`. */
export const getApplicationIdsHavingMarks = async (applicationIds = []) => {
    const ids = (applicationIds || [])
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x) && x > 0);
    if (ids.length === 0) {
        return new Set();
    }
    try {
        const pool = await connectToDatabase();
        const placeholders = ids.map(() => '?').join(',');
        const sql = `
            SELECT DISTINCT application_id
            FROM application_marks
            WHERE application_id IN (${placeholders})
        `;
        const [rows] = await pool.execute(sql, ids);
        return new Set((rows || []).map((r) => r.application_id));
    } catch (error) {
        throw new Error(`Failed to resolve applications with marks: ${error.message}`);
    }
};

// Get all marks details with user and prize information
export const getAllMarksDetails = async (search = '', year = null, year_from = null, year_to = null, prize_id = null, limit = 50, offset = 0) => {
    try {
        const pool = await connectToDatabase();
        let sql = `
            SELECT 
                m.mark_id,
                m.application_id,
                m.marks,
                m.is_winner,
                m.remarks,
                m.created_at,
                u.uid as user_id,
                u.full_name as name,
                u.email,
                p.prize_id,
                p.title as award,
                YEAR(a.submitted_at) as year,
                (
                  SELECT afv.value
                  FROM application_field_values afv
                  INNER JOIN common_fields cf ON afv.common_field_id = cf.common_field_id
                  WHERE afv.application_id = a.application_id
                  AND (cf.field_name LIKE '%phone%' OR cf.field_name LIKE '%contact%' OR cf.field_name LIKE '%mobile%')
                  LIMIT 1
                ) as phone
            FROM application_marks m
            INNER JOIN applications a ON m.application_id = a.application_id
            INNER JOIN users u ON a.user_id = u.uid
            INNER JOIN prize p ON a.prize_id = p.prize_id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Add search filter (search in app id, name, email, or award)
        if (search && search.trim() !== '') {
            sql += ` AND (
                CAST(m.application_id AS CHAR) LIKE ? OR
                CONCAT('APP-', m.application_id) LIKE ? OR
                CONCAT('APP-', LPAD(m.application_id, 3, '0')) LIKE ? OR
                u.full_name LIKE ? OR 
                u.email LIKE ? OR 
                p.title LIKE ?
            )`;
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }
        
        // Add exact year or year range filter
        if (year) {
            sql += ` AND YEAR(a.submitted_at) = ?`;
            params.push(year);
        } else {
            if (year_from) {
                sql += ` AND YEAR(a.submitted_at) >= ?`;
                params.push(year_from);
            }
            if (year_to) {
                sql += ` AND YEAR(a.submitted_at) <= ?`;
                params.push(year_to);
            }
        }
        
        // Add prize filter
        if (prize_id) {
            sql += ` AND p.prize_id = ?`;
            params.push(prize_id);
        }
        
        const { clause } = safeLimitOffset(limit, offset);
        sql += ` ORDER BY m.created_at DESC ${clause}`;

        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        throw new Error(`Failed to fetch marks details: ${error.message}`);
    }
};

export const getAllMarksDetailsCount = async (search = '', year = null, year_from = null, year_to = null, prize_id = null) => {
    const pool = await connectToDatabase();
    let sql = `
      SELECT COUNT(*) AS total
      FROM application_marks m
      INNER JOIN applications a ON m.application_id = a.application_id
      INNER JOIN users u ON a.user_id = u.uid
      INNER JOIN prize p ON a.prize_id = p.prize_id
      WHERE 1=1
    `;
    const params = [];
    if (search && search.trim() !== '') {
        sql += ` AND (
            CAST(m.application_id AS CHAR) LIKE ? OR
            CONCAT('APP-', m.application_id) LIKE ? OR
            CONCAT('APP-', LPAD(m.application_id, 3, '0')) LIKE ? OR
            u.full_name LIKE ? OR
            u.email LIKE ? OR
            p.title LIKE ?
        )`;
        const sp = `%${search.trim()}%`;
        params.push(sp, sp, sp, sp, sp, sp);
    }
    if (year) {
        sql += ` AND YEAR(a.submitted_at) = ?`;
        params.push(year);
    } else {
        if (year_from) {
            sql += ` AND YEAR(a.submitted_at) >= ?`;
            params.push(year_from);
        }
        if (year_to) {
            sql += ` AND YEAR(a.submitted_at) <= ?`;
            params.push(year_to);
        }
    }
    if (prize_id) {
        sql += ` AND p.prize_id = ?`;
        params.push(prize_id);
    }
    const [rows] = await pool.execute(sql, params);
    return rows[0]?.total || 0;
};

// Get distinct years from marks
export const getDistinctYears = async () => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            SELECT DISTINCT YEAR(a.submitted_at) as year
            FROM application_marks m
            INNER JOIN applications a ON m.application_id = a.application_id
            ORDER BY year DESC
        `;
        const [rows] = await pool.execute(sql);
        return rows.map(row => row.year);
    } catch (error) {
        throw new Error(`Failed to fetch distinct years: ${error.message}`);
    }
};

// Get distinct prizes/awards from marks (only active prizes)
export const getDistinctPrizes = async () => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            SELECT DISTINCT p.prize_id, p.title as award
            FROM application_marks m
            INNER JOIN applications a ON m.application_id = a.application_id
            INNER JOIN prize p ON a.prize_id = p.prize_id
            WHERE p.is_active = 1
            ORDER BY p.title ASC
        `;
        const [rows] = await pool.execute(sql);
        return rows.map(row => ({
            prize_id: row.prize_id,
            award: row.award
        }));
    } catch (error) {
        throw new Error(`Failed to fetch distinct prizes: ${error.message}`);
    }
};

