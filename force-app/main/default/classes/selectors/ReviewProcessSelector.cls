public with sharing class ReviewProcessSelector {
    public Database.Cursor selectCursorWithFeedbacksByStatus(String status) {
        String selectReviewProcessesQuery = 'SELECT Id, OwnerId, Name, StartDateTime__c, EndDateTime__c, Status__c, TotalReviewableRecords__c, NegativeFeedbackAmount__c, PositiveFeedbackAmount__c ';
        selectReviewProcessesQuery += 'FROM ReviewProcess__c ';
        selectReviewProcessesQuery += 'WHERE Status__c = :status';

        return Database.getCursor(selectReviewProcessesQuery);
    }

    public ReviewProcess__c selectById(Id recordId) {
        return [
            SELECT Id, Status__c, FieldsForReview__c, FilterCriteria__c, StartDateTime__c, EndDateTime__c
            FROM ReviewProcess__c 
            WHERE Id =: recordId
        ];
    }

    public List<AggregateResult> selectAggregateCountByStatus() {
        return [
            SELECT Status__c status, COUNT(Id) total 
            FROM ReviewProcess__c 
            GROUP BY Status__c
        ];
    }

    public List<AggregateResult> selectAggregateStats() {
        return [
            SELECT
                COUNT(Id) totalProcesses,
                SUM(NegativeFeedbackAmount__c) totalNeg,
                SUM(PositiveFeedbackAmount__c) totalPos,
                SUM(TotalReviewableRecords__c) totalRecords
            FROM ReviewProcess__c
        ];
    }
}