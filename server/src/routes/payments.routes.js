const router = require('express').Router();
const { body, param } = require('express-validator');
const paymentsController       = require('../controllers/payments.controller');
const manualPaymentsController = require('../controllers/manualPayments.controller');
const { authenticate } = require('../middleware/auth');
const { validate }     = require('../middleware/validate');
const { uploadPaymentProof } = require('../middleware/upload');

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/payments/checkout
 * @desc   Create a Stripe Checkout Session for one or more projects
 * @access Private
 */
router.post(
  '/checkout',
  authenticate,
  [
    body('project_ids')
      .isArray({ min: 1 })
      .withMessage('project_ids must be a non-empty array'),
    body('project_ids.*')
      .isInt({ min: 1 })
      .withMessage('Each project ID must be a positive integer'),
  ],
  validate,
  paymentsController.createCheckout
);

/**
 * @route  POST /api/payments/webhook
 * @desc   Stripe webhook endpoint — fulfills orders on payment success
 * @access Public (verified via Stripe signature)
 * NOTE: Must be registered with express.raw() body parser (see app.js)
 */
router.post('/webhook', paymentsController.handleWebhook);

/**
 * @route  GET /api/payments/orders
 * @desc   List the authenticated user's purchase history
 * @access Private
 */
router.get('/orders', authenticate, paymentsController.listOrders);

/**
 * @route  GET /api/payments/orders/:orderId
 * @desc   Get a single order by ID
 * @access Private
 */
router.get(
  '/orders/:orderId',
  authenticate,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  validate,
  paymentsController.getOrder
);

module.exports = router;

// ── Manual Payment Routes ──────────────────────────────────────────────────────

/**
 * @route  GET /api/payments/manual/settings
 * @desc   Get enabled payment methods with account details
 * @access Public
 */
router.get('/manual/settings', manualPaymentsController.getPaymentSettings);

/**
 * @route  POST /api/payments/manual/initiate
 * @desc   Create a pending order for manual payment (Telebirr / CBE Birr)
 * @access Private
 */
router.post(
  '/manual/initiate',
  authenticate,
  [
    body('project_ids').isArray({ min: 1 }).withMessage('project_ids must be a non-empty array'),
    body('project_ids.*').isInt({ min: 1 }),
    body('payment_method')
      .isIn(['telebirr', 'cbe_birr', 'bank_transfer'])
      .withMessage('Invalid payment method'),
  ],
  validate,
  manualPaymentsController.initiateManualOrder
);

/**
 * @route  POST /api/payments/manual/:orderId/proof
 * @desc   Upload payment screenshot for a manual order
 * @access Private
 */
router.post(
  '/manual/:orderId/proof',
  authenticate,
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  validate,
  uploadPaymentProof,
  manualPaymentsController.uploadProof
);

/**
 * @route  GET /api/payments/manual/my-proofs
 * @desc   List the authenticated user's manual payment submissions
 * @access Private
 */
router.get('/manual/my-proofs', authenticate, manualPaymentsController.listMyProofs);

module.exports = router;
