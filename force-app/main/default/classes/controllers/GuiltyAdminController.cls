public class GuiltyAdminController {
    private static final String COMPONENT_KEY = 'admin';

    @AuraEnabled
    public static List<ReviewProcess__c> getReviewProcesses(String status, Integer fetchPosition, Integer fetchCount, Boolean isRefresh) {
        GuiltyCacheService guiltyCache = new GuiltyCacheService(COMPONENT_KEY, status);
        if (!guiltyCache.exists() || isRefresh) {
            Database.Cursor reviewProcessesCursor = new ReviewProcessSelector().selectCursorWithFeedbacksByStatus(status);
            guiltyCache.put(reviewProcessesCursor);
            return safeFetch(reviewProcessesCursor, fetchPosition, fetchCount);
        } else {
            Database.Cursor reviewProcessesCursor = (Database.Cursor) guiltyCache.get();
            return safeFetch(reviewProcessesCursor, fetchPosition, fetchCount);
        }
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getReviewProcessesStatusCounts() {
        Map<String, Integer> totalByStatus = new Map<String, Integer>();

        for (AggregateResult ar : new ReviewProcessSelector().selectAggregateCountByStatus()) {
            totalByStatus.put(
                (String) ar.get('status'), 
                (Integer) ar.get('total')
            );
        }

        return totalByStatus;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getReviewTotals() {
        Map<String, Integer> result = new Map<String, Integer>{
            'ReviewProcessTotal' => 0,
            'ReviewFeedbackTotal' => 0,
            'ReviewRecordsTotal' => 0
        };

        AggregateResult[] aggregates = new ReviewProcessSelector().selectAggregateStats();
        if (!aggregates.isEmpty()) {
            AggregateResult ar = aggregates[0];

            Integer totalProcesses = (Integer) ar.get('totalProcesses');
            Decimal totalNeg = (Decimal) ar.get('totalNeg');
            Decimal totalPos = (Decimal) ar.get('totalPos');
            Decimal totalRecords = (Decimal) ar.get('totalRecords');

            totalProcesses = totalProcesses != null ? totalProcesses : 0;
            totalNeg = totalNeg != null ? totalNeg : 0;
            totalPos = totalPos != null ? totalPos : 0;
            totalRecords = totalRecords != null ? totalRecords : 0;

            result.put('ReviewProcessTotal', totalProcesses);
            result.put('ReviewFeedbackTotal', (Integer) (totalNeg + totalPos));
            result.put('ReviewRecordsTotal', (Integer) totalRecords);
        }

        return result;
    }

    private static List<ReviewProcess__c> safeFetch(Database.Cursor cursor, Integer fetchPosition, Integer fetchCount) {
        Integer totalSize = cursor.getNumRecords();
    
        if (fetchPosition >= totalSize) {
            return new List<ReviewProcess__c>();
        } else {
            fetchCount = (fetchPosition + fetchCount) > totalSize ? totalSize : fetchCount;
            return (List<ReviewProcess__c>) cursor.fetch(fetchPosition, fetchCount);
        }
    }
}