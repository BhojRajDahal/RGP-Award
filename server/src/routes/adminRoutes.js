import { Router } from 'express';
import { loginAdmin, getUsers, getAdmins, registerEvaluator, getEvaluators, deleteEvaluatorController, deleteAdminController, deleteUserController } from '../controllers/adminController.js';
import {
    createCommonFieldController,
    getAllCommonFieldsController,
    getCommonFieldByIdController,
    updateCommonFieldController,
    deleteCommonFieldController,
    createPrizeSpecificFieldController,
    createPrizeSpecificFieldsBulkController,
    getAllPrizeSpecificFieldsController,
    getPrizeSpecificFieldsByPrizeIdController,
    getPrizeSpecificFieldByIdController,
    updatePrizeSpecificFieldController,
    deletePrizeSpecificFieldController,
} from '../controllers/fieldController.js';
import {
    createGalleryItemController,
    getAllGalleryItemsController,
    getGalleryItemByIdController,
    updateGalleryItemController,
    deleteGalleryItemController,
} from '../controllers/galleryController.js';
import {
    getEmailSettingsController,
    updateEmailSettingsController,
    testEmailSettingsController,
} from '../controllers/emailSettingsController.js';
import { verifyAdminToken } from '../middleware/adminAuth.js';
import { uploadWinnerPhoto } from '../middleware/upload.js';
import { getAllMarksDetailsController, getDistinctYearsController, getDistinctPrizesController, updateWinnerStatusController } from '../controllers/applicationController.js';
import { adminLimiter, loginLimiterAdmin } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/login', loginLimiterAdmin, loginAdmin);
router.use(verifyAdminToken, adminLimiter);
router.get('/users', verifyAdminToken, getUsers);
router.get('/admins', verifyAdminToken, getAdmins);
router.delete('/admins/:aid', verifyAdminToken, deleteAdminController);
router.delete('/users/:id', verifyAdminToken, deleteUserController);

// Email Settings Routes
router.get('/email-settings', verifyAdminToken, getEmailSettingsController);
router.put('/email-settings', verifyAdminToken, updateEmailSettingsController);
router.post('/email-settings/test', verifyAdminToken, testEmailSettingsController);

// Evaluator Routes
router.post('/evaluators', verifyAdminToken, registerEvaluator);
router.get('/evaluators', verifyAdminToken, getEvaluators);
router.delete('/evaluators/:evaluator_id', verifyAdminToken, deleteEvaluatorController);

// Common Field Routes
router.post('/common-fields', verifyAdminToken, createCommonFieldController);
router.get('/common-fields', verifyAdminToken, getAllCommonFieldsController);
router.get('/common-fields/:common_field_id', verifyAdminToken, getCommonFieldByIdController);
router.put('/common-fields/:common_field_id', verifyAdminToken, updateCommonFieldController);
router.delete('/common-fields/:common_field_id', verifyAdminToken, deleteCommonFieldController);

// Prize Specific Field Routes
router.post('/prize-specific-fields', verifyAdminToken, createPrizeSpecificFieldController);
router.post('/prize-specific-fields/bulk', verifyAdminToken, createPrizeSpecificFieldsBulkController);
router.get('/prize-specific-fields', verifyAdminToken, getAllPrizeSpecificFieldsController);
router.get('/prize-specific-fields/prize/:prize_id', verifyAdminToken, getPrizeSpecificFieldsByPrizeIdController);
router.get('/prize-specific-fields/:prize_specific_field_id', verifyAdminToken, getPrizeSpecificFieldByIdController);
router.put('/prize-specific-fields/:prize_specific_field_id', verifyAdminToken, updatePrizeSpecificFieldController);
router.delete('/prize-specific-fields/:prize_specific_field_id', verifyAdminToken, deletePrizeSpecificFieldController);

// Gallery Routes
router.post('/gallery', verifyAdminToken, uploadWinnerPhoto.single('photo'), createGalleryItemController);
router.get('/gallery', verifyAdminToken, getAllGalleryItemsController);
router.get('/gallery/:gallery_id', verifyAdminToken, getGalleryItemByIdController);
router.put('/gallery/:gallery_id', verifyAdminToken, uploadWinnerPhoto.single('photo'), updateGalleryItemController);
router.delete('/gallery/:gallery_id', verifyAdminToken, deleteGalleryItemController);

// Marks Details Routes
router.get('/marks-details', verifyAdminToken, getAllMarksDetailsController);
router.get('/marks-details/years', verifyAdminToken, getDistinctYearsController);
router.get('/marks-details/prizes', verifyAdminToken, getDistinctPrizesController);
router.patch('/marks/:mark_id/winner', verifyAdminToken, updateWinnerStatusController);

export default router;

