import {
    createCommonField,
    getAllCommonFields,
    getCommonFieldById,
    updateCommonField,
    deleteCommonField,
    createPrizeSpecificField,
    createPrizeSpecificFieldsBulk,
    getAllPrizeSpecificFields,
    getPrizeSpecificFieldsByPrizeId,
    getPrizeSpecificFieldById,
    updatePrizeSpecificField,
    deletePrizeSpecificField,
} from '../model/fieldModel.js';

const VALID_FIELD_TYPES = new Set(['text', 'textarea', 'number', 'file', 'date', 'label']);
const VALID_FIELD_TYPE_MESSAGE = 'Invalid field type. Must be one of: text, textarea, number, file, date, label';
const normalizedRequired = (fieldType, isRequired) =>
    fieldType === 'label' ? false : isRequired !== undefined ? isRequired : true;
const MAX_BULK_FIELDS = 200;

// Common Field Controllers
export const createCommonFieldController = async (req, res) => {
    try {
        const { field_name, field_type, is_required } = req.body;

        if (!field_name || !field_type) {
            return res.status(400).json({ msg: 'Field name and field type are required' });
        }

        if (!VALID_FIELD_TYPES.has(field_type)) {
            return res.status(400).json({ msg: VALID_FIELD_TYPE_MESSAGE });
        }

        const field = await createCommonField(field_name, field_type, normalizedRequired(field_type, is_required));
        res.status(201).json({ msg: 'Common field created successfully', field });
    } catch (error) {
        res.status(400).json({ msg: error.message || 'Failed to create common field' });
    }
};

export const getAllCommonFieldsController = async (req, res) => {
    try {
        const fields = await getAllCommonFields();
        res.status(200).json(fields);
    } catch (error) {
        res.status(500).json({ 
            msg: error.message || 'Failed to fetch common fields',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const getCommonFieldByIdController = async (req, res) => {
    try {
        const { common_field_id } = req.params;
        const field = await getCommonFieldById(common_field_id);
        
        if (!field) {
            return res.status(404).json({ msg: 'Common field not found' });
        }
        
        res.status(200).json(field);
    } catch (error) {
        res.status(500).json({ 
            msg: error.message || 'Failed to fetch common field',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const updateCommonFieldController = async (req, res) => {
    try {
        const { common_field_id } = req.params;
        const { field_name, field_type, is_required } = req.body;

        if (!field_name || !field_type) {
            return res.status(400).json({ msg: 'Field name and field type are required' });
        }

        if (!VALID_FIELD_TYPES.has(field_type)) {
            return res.status(400).json({ msg: VALID_FIELD_TYPE_MESSAGE });
        }

        const field = await updateCommonField(common_field_id, field_name, field_type, normalizedRequired(field_type, is_required));
        res.status(200).json({ msg: 'Common field updated successfully', field });
    } catch (error) {
        res.status(400).json({ msg: error.message || 'Failed to update common field' });
    }
};

export const deleteCommonFieldController = async (req, res) => {
    try {
        const { common_field_id } = req.params;
        const deleted = await deleteCommonField(common_field_id);
        
        if (!deleted) {
            return res.status(404).json({ msg: 'Common field not found' });
        }
        
        res.status(200).json({ msg: 'Common field deleted successfully' });
    } catch (error) {
        res.status(500).json({ 
            msg: error.message || 'Failed to delete common field',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Prize Specific Field Controllers
export const createPrizeSpecificFieldController = async (req, res) => {
    try {
        const { prize_id, field_name, field_type, is_required } = req.body;

        if (!prize_id || !field_name || !field_type) {
            return res.status(400).json({ msg: 'Prize ID, field name, and field type are required' });
        }

        if (!VALID_FIELD_TYPES.has(field_type)) {
            return res.status(400).json({ msg: VALID_FIELD_TYPE_MESSAGE });
        }

        const field = await createPrizeSpecificField(prize_id, field_name, field_type, normalizedRequired(field_type, is_required));
        res.status(201).json({ msg: 'Prize specific field created successfully', field });
    } catch (error) {
        res.status(400).json({ msg: error.message || 'Failed to create prize specific field' });
    }
};

export const createPrizeSpecificFieldsBulkController = async (req, res) => {
    try {
        const { prize_id, fields } = req.body;

        if (!prize_id) {
            return res.status(400).json({ msg: 'Prize ID is required' });
        }
        if (!Array.isArray(fields) || fields.length === 0) {
            return res.status(400).json({ msg: 'fields must be a non-empty array' });
        }
        if (fields.length > MAX_BULK_FIELDS) {
            return res.status(400).json({ msg: `Too many fields in one request. Max allowed: ${MAX_BULK_FIELDS}` });
        }

        for (const field of fields) {
            if (!field?.field_name || !field?.field_type) {
                return res.status(400).json({ msg: 'Each field requires field_name and field_type' });
            }
            if (!VALID_FIELD_TYPES.has(field.field_type)) {
                return res.status(400).json({
                    msg: VALID_FIELD_TYPE_MESSAGE,
                });
            }
        }

        const normalizedFields = fields.map((field) => ({
            field_name: String(field.field_name).trim(),
            field_type: field.field_type,
            is_required: normalizedRequired(field.field_type, field.is_required),
        }));

        const insertedFields = await createPrizeSpecificFieldsBulk(prize_id, normalizedFields);
        return res.status(201).json({
            msg: 'Prize specific fields created successfully',
            count: insertedFields.length,
            fields: insertedFields,
        });
    } catch (error) {
        return res.status(400).json({ msg: error.message || 'Failed to create prize specific fields' });
    }
};

export const getAllPrizeSpecificFieldsController = async (req, res) => {
    try {
        const fields = await getAllPrizeSpecificFields();
        res.status(200).json(fields);
    } catch (error) {
        res.status(500).json({ 
            msg: error.message || 'Failed to fetch prize specific fields',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const getPrizeSpecificFieldsByPrizeIdController = async (req, res) => {
    try {
        const { prize_id } = req.params;
        const fields = await getPrizeSpecificFieldsByPrizeId(prize_id);
        res.status(200).json(fields);
    } catch (error) {
        res.status(500).json({ 
            msg: error.message || 'Failed to fetch prize specific fields',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const getPrizeSpecificFieldByIdController = async (req, res) => {
    try {
        const { prize_specific_field_id } = req.params;
        const field = await getPrizeSpecificFieldById(prize_specific_field_id);
        
        if (!field) {
            return res.status(404).json({ msg: 'Prize specific field not found' });
        }
        
        res.status(200).json(field);
    } catch (error) {
        res.status(500).json({ 
            msg: error.message || 'Failed to fetch prize specific field',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const updatePrizeSpecificFieldController = async (req, res) => {
    try {
        const { prize_specific_field_id } = req.params;
        const { field_name, field_type, is_required } = req.body;

        if (!field_name || !field_type) {
            return res.status(400).json({ msg: 'Field name and field type are required' });
        }

        if (!VALID_FIELD_TYPES.has(field_type)) {
            return res.status(400).json({ msg: VALID_FIELD_TYPE_MESSAGE });
        }

        const field = await updatePrizeSpecificField(prize_specific_field_id, field_name, field_type, normalizedRequired(field_type, is_required));
        res.status(200).json({ msg: 'Prize specific field updated successfully', field });
    } catch (error) {
        res.status(400).json({ msg: error.message || 'Failed to update prize specific field' });
    }
};

export const deletePrizeSpecificFieldController = async (req, res) => {
    try {
        const { prize_specific_field_id } = req.params;
        const deleted = await deletePrizeSpecificField(prize_specific_field_id);
        
        if (!deleted) {
            return res.status(404).json({ msg: 'Prize specific field not found' });
        }
        
        res.status(200).json({ msg: 'Prize specific field deleted successfully' });
    } catch (error) {
        res.status(500).json({ 
            msg: error.message || 'Failed to delete prize specific field',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

