import {
    createApplication,
    createApplicationWithFieldValuesTransactional,
    getApplicationById,
    getAllApplications,
    getAllApplicationsCount,
    getEvaluatorQueueApplications,
    getEvaluatorQueueApplicationsCount,
    getApplicationsByUserId,
    getApplicationsByPrizeId,
    updateApplicationStatus,
    getApplicationWithFields,
    getUserProfileWithApplications,
    getCommonFieldValuesByApplicationIds,
    getSpecificFieldValuesByApplicationIds,
} from '../model/applicationModel.js';
import { getApplicationIdsHavingMarks } from '../model/markModel.js';
import { getAllCommonFields } from '../model/fieldModel.js';
import { getPrizeSpecificFieldsByPrizeId } from '../model/fieldModel.js';
import { isImageFile } from '../middleware/upload.js';
import { enqueueRejectionEmail } from '../queue/emailQueue.js';
import { cacheKey, getCachedJson, setCachedJson } from './cacheService.js';

const withPrizeSpecificFieldAlias = (application) => ({
    ...application,
    prize_specific_field_values:
        application.prize_specific_field_values || application.specific_field_values || [],
});

// Field Services
export const getCommonFieldsService = async () => {
    const key = cacheKey('fields', 'common');
    const cached = await getCachedJson(key);
    if (cached) return cached;
    const commonFields = await getAllCommonFields();
    const payload = commonFields || [];
    await setCachedJson(key, payload, 300);
    return payload;
};

export const getPrizeSpecificFieldsService = async (prize_id) => {
    if (!prize_id) {
        throw new Error('Prize ID is required');
    }
    const key = cacheKey('fields', 'prize', prize_id);
    const cached = await getCachedJson(key);
    if (cached) return cached;
    const prizeSpecificFields = await getPrizeSpecificFieldsByPrizeId(prize_id);
    const payload = prizeSpecificFields || [];
    await setCachedJson(key, payload, 300);
    return payload;
};

// Application Services
export const submitApplicationService = async (user_id, prize_id, common_field_values, specific_field_values, files) => {
    if (!prize_id) {
        throw new Error('Prize ID is required');
    }

    // Process uploaded files
    const fileMap = {};
    for (const file of files || []) {
        const isImage = isImageFile(file.mimetype);
        const subdirectory = isImage ? 'photos' : 'files';
        const filePath = `${subdirectory}/${file.filename}`;
        fileMap[file.fieldname] = filePath;
    }

    const commonRows = Array.isArray(common_field_values)
        ? common_field_values.map(({ common_field_id, value }) => {
              const fieldKey = `common_${common_field_id}`;
              const file_path = fileMap[fieldKey] || null;
              return { common_field_id, value: value || null, file_path };
          })
        : [];

    const specificRows = Array.isArray(specific_field_values)
        ? specific_field_values.map(({ prize_specific_field_id, value }) => {
              const fieldKey = `specific_${prize_specific_field_id}`;
              const file_path = fileMap[fieldKey] || null;
              return { prize_specific_field_id, value: value || null, file_path };
          })
        : [];

    const applicationId = await createApplicationWithFieldValuesTransactional({
        user_id,
        prize_id,
        status: 'submitted',
        commonFieldValues: commonRows,
        specificFieldValues: specificRows,
    });

    // Return the complete application with fields
    const completeApplication = await getApplicationWithFields(applicationId);
    return withPrizeSpecificFieldAlias(completeApplication);
};

export const getAllApplicationsService = async ({ page = 1, limit = 50 } = {}) => {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const safePage = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1;
    const safeLimit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(Math.floor(limitNum), 100) : 50;
    const offset = (safePage - 1) * safeLimit;

    const [applications, totalItems] = await Promise.all([
        getAllApplications({ limit: safeLimit, offset }),
        getAllApplicationsCount(),
    ]);

    const applicationIds = applications.map((a) => a.application_id);
    const [commonFieldRows, specificFieldRows] = await Promise.all([
        getCommonFieldValuesByApplicationIds(applicationIds),
        getSpecificFieldValuesByApplicationIds(applicationIds),
    ]);

    const commonByAppId = new Map();
    for (const row of commonFieldRows) {
        const appId = row.application_id;
        if (!commonByAppId.has(appId)) commonByAppId.set(appId, []);
        commonByAppId.get(appId).push(row);
    }
    const specificByAppId = new Map();
    for (const row of specificFieldRows) {
        const appId = row.application_id;
        if (!specificByAppId.has(appId)) specificByAppId.set(appId, []);
        specificByAppId.get(appId).push(row);
    }

    const items = applications.map((app) => {
        const specificFieldValues = specificByAppId.get(app.application_id) || [];
        return withPrizeSpecificFieldAlias({
            application_id: app.application_id,
            user_id: app.user_id,
            prize_id: app.prize_id,
            status: app.status,
            submitted_at: app.submitted_at || app.created_at,
            created_at: app.submitted_at || app.created_at,
            updated_at: app.updated_at,
            user: {
                full_name: app.user_name || null,
                email: app.user_email || null,
            },
            prize: {
                prize_name: app.prize_title || null,
            },
            common_field_values: commonByAppId.get(app.application_id) || [],
            specific_field_values: specificFieldValues,
        });
    });

    return {
        items,
        pagination: {
            page: safePage,
            limit: safeLimit,
            totalItems,
            totalPages: Math.ceil(totalItems / safeLimit),
        },
    };
};

/** Accepted + no admin marks yet (evaluator dashboard queue). */
export const getEvaluatorApplicationsService = async ({ page = 1, limit = 50 } = {}) => {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const safePage = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1;
    const safeLimit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(Math.floor(limitNum), 100) : 50;
    const offset = (safePage - 1) * safeLimit;

    const [applications, totalItems] = await Promise.all([
        getEvaluatorQueueApplications({ limit: safeLimit, offset }),
        getEvaluatorQueueApplicationsCount(),
    ]);

    const applicationIds = applications.map((a) => a.application_id);
    const [commonFieldRows, specificFieldRows] = await Promise.all([
        getCommonFieldValuesByApplicationIds(applicationIds),
        getSpecificFieldValuesByApplicationIds(applicationIds),
    ]);

    const commonByAppId = new Map();
    for (const row of commonFieldRows) {
        const appId = row.application_id;
        if (!commonByAppId.has(appId)) commonByAppId.set(appId, []);
        commonByAppId.get(appId).push(row);
    }
    const specificByAppId = new Map();
    for (const row of specificFieldRows) {
        const appId = row.application_id;
        if (!specificByAppId.has(appId)) specificByAppId.set(appId, []);
        specificByAppId.get(appId).push(row);
    }

    const items = applications.map((app) => {
        const specificFieldValues = specificByAppId.get(app.application_id) || [];
        return withPrizeSpecificFieldAlias({
            application_id: app.application_id,
            user_id: app.user_id,
            prize_id: app.prize_id,
            status: app.status,
            submitted_at: app.submitted_at || app.created_at,
            created_at: app.submitted_at || app.created_at,
            updated_at: app.updated_at,
            user: {
                full_name: app.user_name || null,
                email: app.user_email || null,
            },
            prize: {
                prize_name: app.prize_title || null,
            },
            common_field_values: commonByAppId.get(app.application_id) || [],
            specific_field_values: specificFieldValues,
        });
    });

    return {
        items,
        pagination: {
            page: safePage,
            limit: safeLimit,
            totalItems,
            totalPages: Math.max(1, Math.ceil(totalItems / safeLimit)),
        },
    };
};

export const getApplicationByIdService = async (application_id) => {
    const application = await getApplicationWithFields(application_id);
    if (!application) {
        throw new Error('Application not found');
    }
    return withPrizeSpecificFieldAlias(application);
};

export const getApplicationsByUserIdService = async (user_id) => {
    if (!user_id) {
        throw new Error('User ID is required');
    }
    const applications = await getApplicationsByUserId(user_id);
    return applications;
};

export const getApplicationsByPrizeIdService = async (prize_id) => {
    if (!prize_id) {
        throw new Error('Prize ID is required');
    }
    const applications = await getApplicationsByPrizeId(prize_id);
    return applications;
};

export const getUserProfileService = async (user_id) => {
    if (!user_id) {
        throw new Error('User ID is required');
    }
    const userProfile = await getUserProfileWithApplications(user_id);
    if (!userProfile) {
        throw new Error('User not found');
    }
    return {
        ...userProfile,
        applications: userProfile.applications.map(withPrizeSpecificFieldAlias),
    };
};

export const getUserProfileForEvaluatorService = async (user_id) => {
    if (!user_id) {
        throw new Error('User ID is required');
    }
    const userProfile = await getUserProfileWithApplications(user_id);
    if (!userProfile) {
        throw new Error('User not found');
    }

    // Same queue as evaluator list: accepted by admin and no marks row yet
    const accepted = userProfile.applications.filter((app) => app.status === 'accepted');
    const markedIds = await getApplicationIdsHavingMarks(accepted.map((a) => a.application_id));
    const approvedApplications = accepted
        .filter((app) => !markedIds.has(app.application_id))
        .map(withPrizeSpecificFieldAlias);

    return {
        user: userProfile.user,
        applications: approvedApplications,
        total_applications: approvedApplications.length,
    };
};

export const updateApplicationStatusService = async (application_id, status) => {
    const validStatuses = ['submitted', 'processing', 'accepted', 'declined'];
    if (!status || !validStatuses.includes(status)) {
        throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    const application = await updateApplicationStatus(application_id, status);
    return application;
};

export const sendApplicationRejectionEmailService = async (application_id, email_message) => {
    if (!email_message || !email_message.trim()) {
        throw new Error('Email message is required');
    }

    const application = await getApplicationById(application_id);
    if (!application) {
        throw new Error('Application not found');
    }

    const userEmail = application.user_email;
    if (!userEmail) {
        throw new Error('User email not found for this application');
    }

    let emailSent = false;
    let emailError = null;
    try {
        await enqueueRejectionEmail({ userEmail, userName: application.user_name, message: email_message });
        emailSent = true;
    } catch (err) {
        emailError = err;
    }

    return {
        emailSent,
        emailError,
        userEmail,
    };
};


