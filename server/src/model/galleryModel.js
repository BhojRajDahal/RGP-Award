import { connectToDatabase } from '../config/db.js';
import { safeLimitOffset } from '../utils/pagination.js';

// Create a new gallery item
export const createGalleryItem = async (name, award, description, photo, year) => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            INSERT INTO gallery (name, award, description, photo, year)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(sql, [name, award, description || null, photo, year]);
        
        // Fetch and return the created gallery item
        const selectSql = `
            SELECT gallery_id, name, award, description, photo, year, created_at
            FROM gallery
            WHERE gallery_id = ?
        `;
        const [rows] = await pool.execute(selectSql, [result.insertId]);
        return rows[0];
    } catch (error) {
        throw new Error(`Failed to create gallery item: ${error.message}`);
    }
};

// Get all gallery items
export const getAllGalleryItems = async ({ limit = 25, offset = 0 } = {}) => {
    try {
        const pool = await connectToDatabase();
        const { clause } = safeLimitOffset(limit, offset);
        const sql = `
            SELECT gallery_id, name, award, description, photo, year, created_at
            FROM gallery
            ORDER BY created_at DESC, gallery_id DESC
            ${clause}
        `;
        const [rows] = await pool.execute(sql);
        return rows;
    } catch (error) {
        throw new Error(`Failed to fetch gallery items: ${error.message}`);
    }
};

export const getGalleryItemsCount = async () => {
    const pool = await connectToDatabase();
    const [rows] = await pool.execute(`SELECT COUNT(*) AS total FROM gallery`);
    return rows[0]?.total || 0;
};

// Get gallery item by ID
export const getGalleryItemById = async (gallery_id) => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            SELECT gallery_id, name, award, description, photo, year, created_at
            FROM gallery
            WHERE gallery_id = ?
        `;
        const [rows] = await pool.execute(sql, [gallery_id]);
        return rows[0];
    } catch (error) {
        throw new Error(`Failed to fetch gallery item: ${error.message}`);
    }
};

// Update gallery item
export const updateGalleryItem = async (gallery_id, name, award, description, photo, year) => {
    try {
        const pool = await connectToDatabase();
        const sql = `
            UPDATE gallery
            SET name = ?, award = ?, description = ?, photo = ?, year = ?
            WHERE gallery_id = ?
        `;
        await pool.execute(sql, [name, award, description || null, photo, year, gallery_id]);
        
        // Fetch and return the updated gallery item
        return await getGalleryItemById(gallery_id);
    } catch (error) {
        throw new Error(`Failed to update gallery item: ${error.message}`);
    }
};

// Delete gallery item
export const deleteGalleryItem = async (gallery_id) => {
    try {
        const pool = await connectToDatabase();
        const sql = `DELETE FROM gallery WHERE gallery_id = ?`;
        await pool.execute(sql, [gallery_id]);
        return true;
    } catch (error) {
        throw new Error(`Failed to delete gallery item: ${error.message}`);
    }
};

