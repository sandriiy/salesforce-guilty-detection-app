public inherited sharing class ReviewProcessLifecycleService {
    private List<ReviewProcess__c> reviewProcesses;

    public ReviewProcessLifecycleService(List<ReviewProcess__c> reviewProcesses) {
        this.reviewProcesses = reviewProcesses;
    }

    public List<ReviewProcess__c> handleTransition(Map<Id, ReviewProcess__c> oldReviewProcesses) {
        DateTime now = System.now();

        for (ReviewProcess__c reviewProcess : reviewProcesses) {
            if (reviewProcess.EndDateTime__c == null || reviewProcess.EndDateTime__c <= now) {
                continue;
            }

            ReviewProcess__c oldRecord = oldReviewProcesses != null ? oldReviewProcesses.get(reviewProcess.Id) : null;
            if (oldRecord != null && isStatusChanged(reviewProcess, oldRecord) && reviewProcess.Status__c == 'Completed') {
                reviewProcess.IsNotFulfilled__c = true;
            }
        }

        return reviewProcesses;
    }

    private Boolean isStatusChanged(ReviewProcess__c newReviewProcess, ReviewProcess__c oldReviewProcess) {
        if (newReviewProcess == null || oldReviewProcess == null) {
            return false;
        } else {
            String newStatus = (String) newReviewProcess.get('Status__c');
            String oldStatus = (String) oldReviewProcess.get('Status__c');
            return newStatus != oldStatus;
        }
    }
}