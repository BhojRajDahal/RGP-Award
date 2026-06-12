import { createGalleryItemService, getAllGalleryItemsService, getGalleryItemByIdService, updateGalleryItemService, deleteGalleryItemService } from '../services/galleryService.js';

// Create a new gallery item
export const createGalleryItemController = async (req, res) => {
    try {
        const { name, award, description, year } = req.body;
        const photo = req.file ? `winnerPhotoes/${req.file.filename}` : null;

        if (!name || !award || !year) {
            return res.status(400).json({ msg: 'Name, award, and year are required' });
        }

        if (!photo) {
            return res.status(400).json({ msg: 'Photo is required' });
        }

        const galleryItem = await createGalleryItemService(name, award, description, photo, year);
        
        res.status(201).json({
            msg: 'Gallery item created successfully',
            galleryItem,
        });
    } catch (error) {
        console.error('Error creating gallery item:', error);
        const statusCode = error.message.includes('required') || error.message.includes('must be') ? 400 : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to create gallery item',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

// Get all gallery items
export const getAllGalleryItemsController = async (req, res) => {
    try {
        const { page = '1', limit = '25' } = req.query;
        const galleryItems = await getAllGalleryItemsService({ page, limit });
        res.status(200).json(galleryItems);
    } catch (error) {
        console.error('Error fetching gallery items:', error);
        res.status(500).json({
            msg: error.message || 'Failed to fetch gallery items',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

// Get gallery item by ID
export const getGalleryItemByIdController = async (req, res) => {
    try {
        const { gallery_id } = req.params;
        const galleryItem = await getGalleryItemByIdService(gallery_id);
        res.status(200).json(galleryItem);
    } catch (error) {
        console.error('Error fetching gallery item:', error);
        const statusCode = error.message.includes('required') || error.message.includes('not found') ? 
            (error.message.includes('not found') ? 404 : 400) : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to fetch gallery item',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

// Update gallery item
export const updateGalleryItemController = async (req, res) => {
    try {
        const { gallery_id } = req.params;
        const { name, award, description, year } = req.body;
        let photo = req.file ? `winnerPhotoes/${req.file.filename}` : null;

        if (!name || !award || !year) {
            return res.status(400).json({ msg: 'Name, award, and year are required' });
        }

        // If no new file uploaded, use existing photo
        if (!photo) {
            // Get existing item to use its photo
            const existingItem = await getGalleryItemByIdService(gallery_id);
            if (existingItem) {
                photo = existingItem.photo;
            } else {
                return res.status(404).json({ msg: 'Gallery item not found' });
            }
        }

        const galleryItem = await updateGalleryItemService(gallery_id, name, award, description, photo, year);
        
        res.status(200).json({
            msg: 'Gallery item updated successfully',
            galleryItem,
        });
    } catch (error) {
        console.error('Error updating gallery item:', error);
        const statusCode = error.message.includes('required') || error.message.includes('must be') || error.message.includes('not found') ? 
            (error.message.includes('not found') ? 404 : 400) : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to update gallery item',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

// Delete gallery item
export const deleteGalleryItemController = async (req, res) => {
    try {
        const { gallery_id } = req.params;
        await deleteGalleryItemService(gallery_id);
        res.status(200).json({ msg: 'Gallery item deleted successfully' });
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        const statusCode = error.message.includes('required') || error.message.includes('not found') ? 
            (error.message.includes('not found') ? 404 : 400) : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to delete gallery item',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

