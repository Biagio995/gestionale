import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { activeTenantMiddleware } from '../../middleware/activeTenantMiddleware.js';
import { clientTenantMiddleware } from '../../middleware/clientTenantMiddleware.js';
import { roleMiddleware } from '../../middleware/roleMiddleware.js';
import { tenantMiddleware } from '../../middleware/tenantMiddleware.js';
import * as fiscalController from '../fiscal/fiscal.controller.js';
import * as salesController from './sales.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware, activeTenantMiddleware, clientTenantMiddleware);

const adminOnly = roleMiddleware('ADMIN', 'SUPER_ADMIN');

router.get('/stats', salesController.stats);
router.get('/fiscal/dashboard', fiscalController.fiscalDashboard);
router.get('/scadenzario', fiscalController.scadenzario);
router.get('/fiscal/profile', fiscalController.getProfile);
router.put('/fiscal/profile', adminOnly, fiscalController.saveProfile);
router.post('/fiscal/validate-vat', fiscalController.validateVat);

router.get('/contacts/:contactId/documents', salesController.listContactDocuments);

router.get('/passive-invoices', fiscalController.listPassive);
router.post('/passive-invoices', adminOnly, fiscalController.createPassive);
router.post('/passive-invoices/import-xml', adminOnly, fiscalController.importPassiveXml);
router.patch('/passive-invoices/:id/payment', adminOnly, fiscalController.recordPassivePayment);

router.get('/quotes', salesController.listQuotes);
router.post('/quotes', salesController.createQuote);
router.get('/quotes/:id/pdf', fiscalController.getQuotePdf);
router.post('/quotes/:id/send-email', adminOnly, fiscalController.emailQuote);
router.get('/quotes/:id', salesController.getQuote);
router.put('/quotes/:id', salesController.updateQuote);
router.patch('/quotes/:id/status', salesController.updateQuoteStatus);
router.delete('/quotes/:id', salesController.deleteQuote);
router.post('/quotes/:id/convert-to-order', salesController.convertQuoteToOrder);
router.post('/quotes/:id/convert-to-invoice', salesController.convertQuoteToInvoice);

router.get('/pipeline', salesController.getPipeline);
router.get('/orders', salesController.listOrders);
router.get('/orders/:id/pdf', fiscalController.getOrderPdf);
router.post('/orders/:id/send-email', adminOnly, fiscalController.emailOrder);
router.get('/orders/:id', salesController.getOrder);
router.patch('/orders/:id/status', salesController.updateOrderStatus);
router.post('/orders/:id/convert-to-delivery-note', salesController.convertOrderToDeliveryNote);
router.post('/orders/:id/convert-to-invoice', salesController.convertOrderToInvoice);

router.get('/delivery-notes', salesController.listDeliveryNotes);
router.get('/delivery-notes/:id/pdf', fiscalController.getDeliveryNotePdf);
router.post('/delivery-notes/:id/send-email', adminOnly, fiscalController.emailDeliveryNote);
router.get('/delivery-notes/:id', salesController.getDeliveryNote);
router.patch('/delivery-notes/:id/status', salesController.updateDeliveryNoteStatus);
router.post('/delivery-notes/:id/convert-to-invoice', salesController.convertDeliveryNoteToInvoice);

router.get('/invoices', salesController.listInvoices);
router.get('/invoices/:id/pdf', fiscalController.getInvoicePdf);
router.post('/invoices/:id/send-email', adminOnly, fiscalController.emailInvoice);
router.get('/invoices/:id', salesController.getInvoice);
router.put('/invoices/:id', salesController.updateInvoice);
router.post('/invoices/:id/issue', salesController.issueInvoice);
router.patch('/invoices/:id/status', salesController.updateInvoiceStatus);
router.post('/invoices/:id/send-sdi', adminOnly, fiscalController.sendSdi);
router.get('/invoices/:id/xml', fiscalController.getXml);
router.patch('/invoices/:id/payment', adminOnly, fiscalController.recordPayment);

export default router;
