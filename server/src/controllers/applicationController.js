import {
    getCommonFieldsService,
    getPrizeSpecificFieldsService,
    submitApplicationService,
    getAllApplicationsService,
    getEvaluatorApplicationsService,
    getApplicationByIdService,
    getApplicationsByUserIdService,
    getApplicationsByPrizeIdService,
    getUserProfileService,
    getUserProfileForEvaluatorService,
    updateApplicationStatusService,
    sendApplicationRejectionEmailService,
} from '../services/applicationService.js';
import { createMarkService, getMarksByApplicationIdService, getAllMarksDetailsService, getDistinctYearsService, getDistinctPrizesService, updateWinnerStatusService } from '../services/markService.js';
import { enqueueApprovalEmail } from '../queue/emailQueue.js';

// ============================================
// FIELD ENDPOINTS
// ============================================

export const getCommonFieldsController = async (req, res) => {
    try {
        const commonFields = await getCommonFieldsService();
        res.status(200).json({
            common_fields: commonFields,
        });
    } catch (error) {
        console.error('[getCommonFieldsController] Error:', error);
        res.status(500).json({
            msg: error.message || 'Failed to fetch common fields',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getPrizeSpecificFieldsController = async (req, res) => {
    try {
        const { prize_id } = req.params;
        
        // Validate prize_id is a valid number
        const prizeIdNum = parseInt(prize_id, 10);
        if (!prize_id || isNaN(prizeIdNum) || prizeIdNum <= 0) {
            return res.status(400).json({ msg: 'Invalid prize ID' });
        }
        
        const prizeSpecificFields = await getPrizeSpecificFieldsService(prizeIdNum);
        res.status(200).json({
            prize_specific_fields: prizeSpecificFields,
        });
    } catch (error) {
        console.error('[getPrizeSpecificFieldsController] Error:', error);
        const statusCode = error.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to fetch prize-specific fields',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

// ============================================
// APPLICATION ENDPOINTS
// ============================================

export const submitApplicationController = async (req, res) => {
    try {
        // Get user_id from token for security
        const user_id = req.user?.user_id;
        if (!user_id) {
            return res.status(403).json({ msg: 'Access denied: user ID not found in token' });
        }
        
        // Parse JSON data from form fields
        let prize_id, common_field_values, specific_field_values;
        
        if (req.body.prize_id) {
            // If data comes as form fields (multipart/form-data)
            prize_id = req.body.prize_id;
            try {
                common_field_values = req.body.common_field_values 
                    ? JSON.parse(req.body.common_field_values) 
                    : [];
                specific_field_values = req.body.specific_field_values 
                    ? JSON.parse(req.body.specific_field_values) 
                    : [];
            } catch (parseError) {
                console.error('Error parsing JSON fields:', parseError);
                return res.status(400).json({ msg: 'Invalid JSON data in form fields' });
            }
        } else {
            // If data comes as JSON (application/json)
            ({ prize_id, common_field_values, specific_field_values } = req.body);
        }

        const files = req.files || [];
        const completeApplication = await submitApplicationService(
            user_id,
            prize_id,
            common_field_values,
            specific_field_values,
            files
        );

        res.status(201).json({
            msg: 'Application submitted successfully',
            application: completeApplication,
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        const statusCode = error.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to submit application',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getAllApplicationsController = async (req, res) => {
    try {
        const { page = '1', limit = '50' } = req.query;
        const result = await getAllApplicationsService({ page, limit });
        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            msg: error.message || 'Failed to fetch applications',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getEvaluatorApplicationsController = async (req, res) => {
    try {
        const { page = '1', limit = '50' } = req.query;
        const result = await getEvaluatorApplicationsService({ page, limit });
        res.setHeader('Cache-Control', 'no-store, private');
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            msg: error.message || 'Failed to fetch evaluator applications',
        });
    }
};

export const getApplicationByIdController = async (req, res) => {
    try {
        const { application_id } = req.params;
        
        // Validate application_id is a valid number
        const appIdNum = parseInt(application_id, 10);
        if (!application_id || isNaN(appIdNum) || appIdNum <= 0) {
            return res.status(400).json({ msg: 'Invalid application ID' });
        }
        
        const application = await getApplicationByIdService(appIdNum);
        
        // Security: Users can only view their own applications
        // Admins can view any application (handled by admin routes)
        if (req.user && req.user.user_id && application.user_id !== req.user.user_id) {
            return res.status(403).json({ msg: 'Access denied: You can only view your own applications' });
        }
        
        res.status(200).json(application);
    } catch (error) {
        console.error('Error fetching application:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to fetch application',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getApplicationsByUserIdController = async (req, res) => {
    try {
        // Use user_id from token instead of params for security
        const user_id = req.user?.user_id;
        if (!user_id) {
            return res.status(403).json({ msg: 'Access denied: user ID not found in token' });
        }
        
        const applications = await getApplicationsByUserIdService(user_id);
        res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching user applications:', error);
        const statusCode = error.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to fetch user applications',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getApplicationsByPrizeIdController = async (req, res) => {
    try {
        const { prize_id } = req.params;
        const applications = await getApplicationsByPrizeIdService(prize_id);
        res.status(200).json(applications);
    } catch (error) {
        console.error('Error fetching prize applications:', error);
        const statusCode = error.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to fetch prize applications',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getUserProfileController = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        // Validate user_id is a valid number
        const userIdNum = parseInt(user_id, 10);
        if (!user_id || isNaN(userIdNum) || userIdNum <= 0) {
            return res.status(400).json({ msg: 'Invalid user ID' });
        }
        
        const userProfile = await getUserProfileService(userIdNum);
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        const statusCode = error.message.includes('not found') || error.message.includes('required') ? 
            (error.message.includes('not found') ? 404 : 400) : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to fetch user profile',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getUserProfileForEvaluatorController = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        // Validate user_id is a valid number
        const userIdNum = parseInt(user_id, 10);
        if (!user_id || isNaN(userIdNum) || userIdNum <= 0) {
            return res.status(400).json({ msg: 'Invalid user ID' });
        }
        
        const userProfile = await getUserProfileForEvaluatorService(userIdNum);
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error fetching user profile for evaluator:', error);
        const statusCode = error.message.includes('not found') || error.message.includes('required') ? 
            (error.message.includes('not found') ? 404 : 400) : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to fetch user profile',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const updateApplicationStatusController = async (req, res) => {
    try {
        const { application_id } = req.params;
        const { status } = req.body;

        const application = await updateApplicationStatusService(application_id, status);
        
        // Send email if status is accepted
        if (status === 'accepted' && application.user_email) {
            enqueueApprovalEmail({ userEmail: application.user_email, userName: application.user_name }).catch((emailError) =>
                console.error('[updateApplicationStatusController] Failed to enqueue approval email:', emailError?.message || emailError)
            );
        }
        
        res.status(200).json({
            msg: 'Application status updated successfully',
            application,
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        const statusCode = error.message.includes('must be one of') || error.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to update application status',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const sendCustomEmailController = async (req, res) => {
    try {
        const { application_id } = req.params;
        const { email_message } = req.body;

        const result = await sendApplicationRejectionEmailService(application_id, email_message);
        
        if (result.emailSent) {
            res.status(200).json({
                msg: 'Email sent successfully',
            });
        } else {
            res.status(200).json({
                msg: 'Application status updated, but email could not be sent',
                warning: result.emailError?.message || 'Email service is not configured. Please check your SMTP settings in .env file. For Gmail, you need to use an App Password.',
                emailConfigured: false,
            });
        }
    } catch (error) {
        console.error('Error sending custom email:', error);
        const statusCode = error.message.includes('not found') || error.message.includes('required') ? 
            (error.message.includes('not found') ? 404 : 400) : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to process request',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

// ============================================
// MARK ENDPOINTS
// ============================================

export const assignMarksController = async (req, res) => {
    try {
        const { application_id } = req.params;
        const { marks, remarks } = req.body;
        const admin_id = req.admin.aid;

        if (!marks || marks === null || marks === undefined) {
            return res.status(400).json({ msg: 'Marks are required' });
        }

        const mark = await createMarkService(application_id, admin_id, marks, remarks);
        
        res.status(201).json({
            msg: 'Marks assigned successfully',
            mark,
        });
    } catch (error) {
        console.error('Error assigning marks:', error);
        const statusCode = error.message.includes('required') || error.message.includes('must be') ? 400 : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to assign marks',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getMarksByApplicationIdController = async (req, res) => {
    try {
        const { application_id } = req.params;
        const marks = await getMarksByApplicationIdService(application_id);
        res.status(200).json(marks);
    } catch (error) {
        console.error('Error fetching marks:', error);
        const statusCode = error.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to fetch marks',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getAllMarksDetailsController = async (req, res) => {
    try {
        const { search = '', year = null, year_from = null, year_to = null, prize_id = null, page = '1', limit = '50' } = req.query;
        // Validate and parse prize_id safely
        let prizeIdParam = null;
        if (prize_id && prize_id !== 'all') {
            const parsed = parseInt(prize_id, 10);
            if (!isNaN(parsed) && parsed > 0) {
                prizeIdParam = parsed;
            }
        }

        const parseYear = (value) => {
            const parsed = parseInt(value, 10);
            return !isNaN(parsed) && parsed > 0 ? parsed : null;
        };
        const yearParam = year && year !== 'all' ? parseYear(year) : null;
        let yearFromParam = year_from && year_from !== 'all' ? parseYear(year_from) : null;
        let yearToParam = year_to && year_to !== 'all' ? parseYear(year_to) : null;
        if (yearFromParam && yearToParam && yearFromParam > yearToParam) {
            [yearFromParam, yearToParam] = [yearToParam, yearFromParam];
        }

        const marksDetails = await getAllMarksDetailsService(search, yearParam, yearFromParam, yearToParam, prizeIdParam, page, limit);
        res.status(200).json({
            marks_details: marksDetails.items,
            pagination: marksDetails.pagination,
        });
    } catch (error) {
        console.error('Error fetching marks details:', error);
        res.status(500).json({
            msg: error.message || 'Failed to fetch marks details',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const updateWinnerStatusController = async (req, res) => {
    try {
        const { mark_id } = req.params;
        const { is_winner } = req.body;

        if (is_winner === undefined || is_winner === null) {
            return res.status(400).json({ msg: 'Winner status is required' });
        }

        const winnerValue = is_winner === true || is_winner === 'true' || is_winner === 1 || is_winner === '1';
        const mark = await updateWinnerStatusService(mark_id, winnerValue);
        res.status(200).json({
            msg: 'Winner status updated successfully',
            mark,
        });
    } catch (error) {
        console.error('Error updating winner status:', error);
        const statusCode = error.message.includes('required') || error.message.includes('not found')
            ? (error.message.includes('not found') ? 404 : 400)
            : 500;
        res.status(statusCode).json({
            msg: error.message || 'Failed to update winner status',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getDistinctYearsController = async (req, res) => {
    try {
        const years = await getDistinctYearsService();
        res.status(200).json({
            years: years,
        });
    } catch (error) {
        console.error('Error fetching distinct years:', error);
        res.status(500).json({
            msg: error.message || 'Failed to fetch distinct years',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

export const getDistinctPrizesController = async (req, res) => {
    try {
        const prizes = await getDistinctPrizesService();
        res.status(200).json({
            prizes: prizes,
        });
    } catch (error) {
        console.error('Error fetching distinct prizes:', error);
        res.status(500).json({
            msg: error.message || 'Failed to fetch distinct prizes',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};
