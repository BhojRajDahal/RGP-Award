import { createGalleryItem, deleteGalleryItem, getAllGalleryItems, getGalleryItemById, getGalleryItemsCount, updateGalleryItem } from '../model/galleryModel.js';

// Service to create a gallery item
export const createGalleryItemService = async (name, award, description, photo, year) => {
    if (!name || !award || !photo || !year) {
        throw new Error('Name, award, photo, and year are required');
    }

    // Validate year is a number
    const yearValue = parseInt(year);
    if (isNaN(yearValue) || yearValue < 2000 || yearValue > 3000) {
        throw new Error('Year must be a valid number (e.g., 2076 for Nepali year)');
    }

    try {
        const galleryItem = await createGalleryItem(name, award, description?.trim() || null, photo, yearValue);
        return galleryItem;
    } catch (error) {
        throw new Error(`Failed to create gallery item: ${error.message}`);
    }
};

// Service to get all gallery items
export const getAllGalleryItemsService = async ({ page = 1, limit = 25 } = {}) => {
    try {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
        const offset = (safePage - 1) * safeLimit;
        const [items, totalItems] = await Promise.all([
            getAllGalleryItems({ limit: safeLimit, offset }),
            getGalleryItemsCount(),
        ]);
        return {
            items,
            pagination: {
                page: safePage,
                limit: safeLimit,
                totalItems,
                totalPages: Math.ceil(totalItems / safeLimit),
            },
        };
    } catch (error) {
        throw new Error(`Failed to fetch gallery items: ${error.message}`);
    }
};

// Service to get gallery item by ID
export const getGalleryItemByIdService = async (gallery_id) => {
    if (!gallery_id) {
        throw new Error('Gallery ID is required');
    }

    try {
        const galleryItem = await getGalleryItemById(gallery_id);
        if (!galleryItem) {
            throw new Error('Gallery item not found');
        }
        return galleryItem;
    } catch (error) {
        throw new Error(`Failed to fetch gallery item: ${error.message}`);
    }
};

// Service to update gallery item
export const updateGalleryItemService = async (gallery_id, name, award, description, photo, year) => {
    if (!gallery_id || !name || !award || !photo || !year) {
        throw new Error('Gallery ID, name, award, photo, and year are required');
    }

    // Validate year is a number
    const yearValue = parseInt(year);
    if (isNaN(yearValue) || yearValue < 2000 || yearValue > 3000) {
        throw new Error('Year must be a valid number (e.g., 2076 for Nepali year)');
    }

    try {
        const galleryItem = await updateGalleryItem(gallery_id, name, award, description?.trim() || null, photo, yearValue);
        return galleryItem;
    } catch (error) {
        throw new Error(`Failed to update gallery item: ${error.message}`);
    }
};

// Service to delete gallery item
export const deleteGalleryItemService = async (gallery_id) => {
    if (!gallery_id) {
        throw new Error('Gallery ID is required');
    }

    try {
        await deleteGalleryItem(gallery_id);
        return true;
    } catch (error) {
        throw new Error(`Failed to delete gallery item: ${error.message}`);
    }
};

