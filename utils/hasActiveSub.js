const hasActiveSubscription = (gradeName,subscriptions) => !!subscriptions.find(x => 
    x.status && x.subscription_end > new Date() && x.gradeName === gradeName
)

module.exports = { hasActiveSubscription }