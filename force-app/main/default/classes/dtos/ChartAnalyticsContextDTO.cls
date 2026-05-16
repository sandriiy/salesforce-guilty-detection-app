public class ChartAnalyticsContextDTO {
    @AuraEnabled public String baseObjectApiName;
    @AuraEnabled public String baseObjectLabel;
    @AuraEnabled public List<RelationshipPathDTO> availableRelationshipPaths;
    @AuraEnabled public List<PicklistValueDTO> availableChartTypes;

    public class RelationshipPathDTO {
        @AuraEnabled public String key;
        @AuraEnabled public String label;
        @AuraEnabled public String sourceObjectApiName;
        @AuraEnabled public String sourceObjectLabel;
        @AuraEnabled public Boolean isIdBasedReference;
        @AuraEnabled public String joinFieldApiName;
        @AuraEnabled public List<SObjectFieldDTO> availableGroupByFields;
        @AuraEnabled public List<SObjectFieldDTO> availableFilterFields;
    }
}
