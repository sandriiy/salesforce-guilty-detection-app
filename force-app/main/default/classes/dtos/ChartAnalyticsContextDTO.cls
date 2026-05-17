public class ChartAnalyticsContextDTO {
    @AuraEnabled
    public String baseObjectApiName;
    @AuraEnabled
    public String baseObjectLabel;
    @AuraEnabled
    public String selectedRelationshipPath;
    @AuraEnabled
    public String selectedSourceObjectApiName;
    @AuraEnabled
    public String defaultGroupByFieldApiName;
    @AuraEnabled
    public String defaultAggregationType;
    @AuraEnabled
    public String defaultChartType;
    @AuraEnabled
    public List<ChartRelationshipPathDTO> relationshipPaths;
    @AuraEnabled
    public List<SObjectFieldDTO> groupByFields;
    @AuraEnabled
    public List<SObjectFieldDTO> baseFilterableFields;
    @AuraEnabled
    public List<SObjectFieldDTO> filterableFields;
    @AuraEnabled
    public List<SObjectFieldDTO> aggregationFields;
    @AuraEnabled
    public List<PicklistValueDTO> availableChartTypes;
    @AuraEnabled
    public List<PicklistValueDTO> aggregationTypes;
}