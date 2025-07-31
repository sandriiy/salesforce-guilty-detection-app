public with sharing class GuiltyReviewerController {
    @AuraEnabled(cacheable=true)
    public static List<ReviewProcess__c> getOngoingReviewProcesses(Id userId) {
        ReviewProcessSelector reviewProcessSelector = new ReviewProcessSelector();
        return reviewProcessSelector.selectWithUserFeedbacksByStatus(
            userId,
            'Ongoing'
        );
    }

    @AuraEnabled
    public static ReviewFeedbackDTO getReviewFeedbackWithItemsById(Id reviewFeedbackId) {
        ReviewFeedback__c reviewFeedback = new ReviewFeedbackSelector().selectWithItemsById(reviewFeedbackId);
        return ReviewFeedbackRecordAssembler.assemblePayloadWithItems(reviewFeedback);
    }

    @AuraEnabled
    public static void submitReviewFeedback(ReviewFeedbackDTO reviewFeedbackDTO) {
        ReviewFeedbackLifecycleService reviewFeedbackService = new ReviewFeedbackLifecycleService(
            UserInfo.getUserId(),
            reviewFeedbackDTO.reviewFeedback.ReviewProcessId__c
        );

        reviewFeedbackService.submitReviewFeedback(reviewFeedbackDTO);
    }

    @AuraEnabled
    public static void saveReviewFeedback(ReviewFeedbackDTO reviewFeedbackDTO) {
        ReviewFeedbackLifecycleService reviewFeedbackService = new ReviewFeedbackLifecycleService(
            UserInfo.getUserId(),
            reviewFeedbackDTO.reviewFeedback.ReviewProcessId__c
        );

        reviewFeedbackService.saveDraftReviewFeedback(reviewFeedbackDTO);
    }

    @AuraEnabled
    public static ReviewFeedback__c beginNewFeedbackProcessByReviewId(Id reviewProcessId) {
        ReviewFeedbackLifecycleService reviewFeedbackService = new ReviewFeedbackLifecycleService(
            UserInfo.getUserId(),
            reviewProcessId
        );

        return reviewFeedbackService.createNewReviewFeedback();
    }
}