public with sharing class GuiltyChartDTOs {
    public class DatasetRequest {
        @AuraEnabled public String baseObjectApiName { get; set; }
        @AuraEnabled public String sourceObjectApiName { get; set; }
        @AuraEnabled public String relationshipPath { get; set; }
        @AuraEnabled public String groupByFieldApiName { get; set; }
        @AuraEnabled public String aggregationType { get; set; }
        @AuraEnabled public String chartType { get; set; }
    }

    public class DatasetResponse {
        @AuraEnabled public List<String> labels { get; set; }
        @AuraEnabled public List<Decimal> datasets { get; set; }
        @AuraEnabled public String chartType { get; set; }
        @AuraEnabled public String sourceObjectApiName { get; set; }
        @AuraEnabled public String errorMessage { get; set; }
    }
}