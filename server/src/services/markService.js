import { createMark, deleteMark, getAllMarksDetails, getAllMarksDetailsCount, getDistinctPrizes, getDistinctYears, getMarkById, getMarksByApplicationId, updateMark, updateWinnerStatus } from '../model/markModel.js';

// Service to create a mark
export const createMarkService = async (application_id, admin_id, marks, remarks = null) => {
    if (!application_id || !admin_id || marks === undefined || marks === null) {
        throw new Error('Application ID, Admin ID, and marks are required');
    }

    // Validate marks is a number and within valid range (0-100)
    const marksValue = parseFloat(marks);
    if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
        throw new Error('Marks must be a number between 0 and 100');
    }

    // Check if marks already exist for this application
    const existingMarks = await getMarksByApplicationId(application_id);
    if (existingMarks && existingMarks.length > 0) {
        throw new Error('Marks have already been assigned to this application. Each application can only have marks assigned once.');
    }

    try {
        const mark = await createMark(application_id, admin_id, marksValue, remarks);
        return mark;
    } catch (error) {
        throw new Error(`Failed to create mark: ${error.message}`);
    }
};

// Service to get marks by application ID
export const getMarksByApplicationIdService = async (application_id) => {
    if (!application_id) {
        throw new Error('Application ID is required');
    }

    try {
        const marks = await getMarksByApplicationId(application_id);
        return marks;
    } catch (error) {
        throw new Error(`Failed to fetch marks: ${error.message}`);
    }
};

// Service to get mark by ID
export const getMarkByIdService = async (mark_id) => {
    if (!mark_id) {
        throw new Error('Mark ID is required');
    }

    try {
        const mark = await getMarkById(mark_id);
        if (!mark) {
            throw new Error('Mark not found');
        }
        return mark;
    } catch (error) {
        throw new Error(`Failed to fetch mark: ${error.message}`);
    }
};

// Service to update mark
export const updateMarkService = async (mark_id, marks, remarks = null) => {
    if (!mark_id || marks === undefined || marks === null) {
        throw new Error('Mark ID and marks are required');
    }

    // Validate marks is a number and within valid range (0-100)
    const marksValue = parseFloat(marks);
    if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
        throw new Error('Marks must be a number between 0 and 100');
    }

    try {
        const mark = await updateMark(mark_id, marksValue, remarks);
        return mark;
    } catch (error) {
        throw new Error(`Failed to update mark: ${error.message}`);
    }
};

export const updateWinnerStatusService = async (mark_id, is_winner) => {
    if (!mark_id) {
        throw new Error('Mark ID is required');
    }

    try {
        const mark = await updateWinnerStatus(mark_id, Boolean(is_winner));
        if (!mark) {
            throw new Error('Mark not found');
        }
        return mark;
    } catch (error) {
        throw new Error(`Failed to update winner status: ${error.message}`);
    }
};

// Service to delete mark
export const deleteMarkService = async (mark_id) => {
    if (!mark_id) {
        throw new Error('Mark ID is required');
    }

    try {
        await deleteMark(mark_id);
        return true;
    } catch (error) {
        throw new Error(`Failed to delete mark: ${error.message}`);
    }
};

// Service to get all marks details
export const getAllMarksDetailsService = async (search = '', year = null, year_from = null, year_to = null, prize_id = null, page = 1, limit = 50) => {
    try {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
        const offset = (safePage - 1) * safeLimit;
        const [items, totalItems] = await Promise.all([
            getAllMarksDetails(search, year, year_from, year_to, prize_id, safeLimit, offset),
            getAllMarksDetailsCount(search, year, year_from, year_to, prize_id),
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
        throw new Error(`Failed to fetch marks details: ${error.message}`);
    }
};

// Service to get distinct years
export const getDistinctYearsService = async () => {
    try {
        const years = await getDistinctYears();
        return years;
    } catch (error) {
        throw new Error(`Failed to fetch distinct years: ${error.message}`);
    }
};

// Service to get distinct prizes
export const getDistinctPrizesService = async () => {
    try {
        const prizes = await getDistinctPrizes();
        return prizes;
    } catch (error) {
        throw new Error(`Failed to fetch distinct prizes: ${error.message}`);
    }
};

