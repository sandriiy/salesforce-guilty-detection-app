public with sharing class GuiltyChartAnalyticsService {
    public static GuiltyChartDTOs.DatasetResponse getChartDataset(GuiltyChartDTOs.DatasetRequest request) {
        GuiltyChartDTOs.DatasetResponse response = new GuiltyChartDTOs.DatasetResponse();
        response.labels = new List<String>();
        response.datasets = new List<Decimal>();
        response.chartType = request.chartType;
        response.sourceObjectApiName = request.sourceObjectApiName;
        
        try {
            String query = GuiltyChartQueryBuilder.buildAggregateQuery(request);
            List<AggregateResult> results = Database.query(query);
            
            // Check if we need to resolve polymorphic IDs
            Boolean isPolymorphicId = request.groupByFieldApiName != null && request.groupByFieldApiName.equalsIgnoreCase('RecordId__c');
            Map<String, String> idToNameMap = new Map<String, String>();
            
            if (isPolymorphicId) {
                Set<Id> recordIds = new Set<Id>();
                for (AggregateResult ar : results) {
                    String label = String.valueOf(ar.get('label'));
                    if (label != null && label.length() >= 15) {
                        try {
                            recordIds.add((Id)label);
                        } catch (Exception ex) {
                            // Suppress invalid ids
                        }
                    }
                }
                
                if (!recordIds.isEmpty() && String.isNotBlank(request.baseObjectApiName)) {
                    String baseObj = String.escapeSingleQuotes(request.baseObjectApiName);
                    String nameQuery = 'SELECT Id, Name FROM ' + baseObj + ' WHERE Id IN :recordIds WITH USER_MODE';
                    try {
                        for (SObject sObj : Database.query(nameQuery)) {
                            idToNameMap.put(String.valueOf(sObj.get('Id')), String.valueOf(sObj.get('Name')));
                        }
                    } catch (Exception ex) {
                        // ignore query exceptions if name doesn't exist
                    }
                }
            }
            
            for (AggregateResult ar : results) {
                String label = String.valueOf(ar.get('label'));
                Decimal val = (Decimal) ar.get('val');
                
                if (isPolymorphicId && label != null && idToNameMap.containsKey(label)) {
                    label = idToNameMap.get(label);
                }
                
                response.labels.add(label != null ? label : 'Unknown');
                response.datasets.add(val);
            }
        } catch (Exception e) {
            response.errorMessage = e.getMessage();
        }
        
        return response;
    }
}