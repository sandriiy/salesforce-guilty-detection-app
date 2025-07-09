trigger ReviewProcessTrigger on ReviewProcess__c (before insert, before update, after insert, after update) {
    new ReviewProcessTriggerHandler().run();
}