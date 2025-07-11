public class GuiltyReviewerController {
    @AuraEnabled(cacheable=true)
    public static List<ReviewProcess__c> getOngoingReviewProcesses(Id userId) {
        ReviewProcessSelector reviewProcessSelector = new ReviewProcessSelector();
        return reviewProcessSelector.selectWithUserFeedbacksByStatus(
            userId,
            'Ongoing'
        );
    }
}