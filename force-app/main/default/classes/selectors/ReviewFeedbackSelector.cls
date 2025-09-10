public with sharing class ReviewFeedbackSelector {
    public ReviewFeedback__c selectWithItemsById(Id feedbackId) {
        List<ReviewFeedback__c> reviewFeedback = [
            SELECT Id, Name, RecordId__c, RecordType__c, ReviewProcessId__c,
                isReviewed__c, ReviewerId__c, AdditionalComment__c,
                ReviewProcessId__r.ReviewInstructions__c,
                (
                    SELECT Id, Name, Type__c, Instructions__c, Comment__c, Assessment__c
                    FROM ReviewFeedbackItems__r
                    ORDER BY Name
                )
            FROM ReviewFeedback__c
            WHERE Id = :feedbackId
            LIMIT 1
        ];

        return reviewFeedback.isEmpty() ? null : reviewFeedback.get(0);
    }
}