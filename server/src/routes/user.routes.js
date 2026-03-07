const { Router } = require('express');
const userCtrl = require('../controllers/user.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { updateProfileSchema, changePasswordSchema } = require('../utils/schemas');

const router = Router();

router.use(authenticate);

router.put('/profile', validate(updateProfileSchema), userCtrl.updateProfile);
router.put('/password', validate(changePasswordSchema), userCtrl.changePassword);
router.delete('/', userCtrl.deleteAccount);

module.exports = router;
