public without sharing class ReviewProcessTriggerHandler extends TriggerHandler {
    private Map<Id, ReviewProcess__c> newReviewProcessMap;
    private Map<Id, ReviewProcess__c> oldReviewProcessMap;

    public ReviewProcessTriggerHandler() {
        this.newReviewProcessMap = (Map<Id, ReviewProcess__c>) Trigger.newMap;
        this.oldReviewProcessMap = (Map<Id, ReviewProcess__c>) Trigger.oldMap;
    }

    public override void beforeUpdate() {
        ReviewProcessLifecycleService lifecycleService = new ReviewProcessLifecycleService(newReviewProcessMap.values());
        lifecycleService.handleTransition(oldReviewProcessMap);
    }
}