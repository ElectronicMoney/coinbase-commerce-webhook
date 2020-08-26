const Express = require('express');
require('dotenv').config()
const Webhook  = require('coinbase-commerce-node').Webhook;
const redis   = require("redis");

const publisher = redis.createClient();

/**
 * Past your webhook secret from Settings/Webhook section
 */
const webhookSecret =  process.env.COINBASE_COMMERCE_SECRET;
const router = Express.Router();
const app = Express();

function rawBody(req, res, next) {
	req.setEncoding('utf8');

	let data = '';

	req.on('data', function (chunk) {
		data += chunk;
	});

	req.on('end', function () {
		req.rawBody = data;

		next();
	});
}

router.post('/', function (request, response) {
	let event;

	try {
		event = Webhook.verifyEventBody(
			request.rawBody,
			request.headers['x-cc-webhook-signature'],
			webhookSecret
        );
        
	} catch (error) {
		console.log('Error occured', error.message);

		return response.status(400).send('Webhook Error:' + error.message);
	}

    // The Payment Payload Object
    const paymentPayload = {
        payment_reference_number: event.id,
        payment_code:event.data.code,
        event_type: event.type,
        hosted_url: event.data.hosted_url,
        currency: event.data.pricing.local.currency,
        amount: event.data.pricing.local.amount
    }
    // Publish the payment payload
    publisher.publish("payment_webhook", JSON.stringify(paymentPayload));
    // Return response
	response.status(200).send('Signed Webhook Received: ' + event.id);
});

app.use(rawBody);
app.use(router);

app.listen(process.env.PORT, function () {
	console.log(`Crypto Payment Webhook Service listening on port ${process.env.PORT}!`);
});