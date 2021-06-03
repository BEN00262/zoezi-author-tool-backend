const amqp = require('amqplib/callback_api');

const QUEUE = 'paper_submission';

const sendToSubmissionQueue = (clientID, paperID) => new Promise((resolve,reject) => {
    amqp.connect(process.env.AMQP_SERVER_URI, (error0, connection) => {
        if (error0) { reject(error0); }

        connection.createChannel((error1, channel) => {
            if (error1){ reject(error1); }

            const message = JSON.stringify({
                clientID,
                paperID
            });

            channel.assertQueue(QUEUE, { durable: true });

            channel.sendToQueue(QUEUE,Buffer.from(message), { persistent: true });
            resolve(true);
        });
    })
});

module.exports = sendToSubmissionQueue;