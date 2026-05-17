public class ChartDatasetResponseDTO {
    @AuraEnabled
    public List<String> labels;
    @AuraEnabled
    public List<ChartDatasetSeriesDTO> datasets;
    @AuraEnabled
    public String chartType;
    @AuraEnabled
    public String groupByFieldApiName;
    @AuraEnabled
    public String groupByFieldLabel;
    @AuraEnabled
    public String aggregationType;
    @AuraEnabled
    public String aggregationFieldApiName;
    @AuraEnabled
    public String sourceObjectApiName;
    @AuraEnabled
    public String sourceObjectLabel;
    @AuraEnabled
    public String relationshipPathValue;
    @AuraEnabled
    public String relationshipPathLabel;
    @AuraEnabled
    public Boolean usesIdReference;
    @AuraEnabled
    public List<String> warnings;
    @AuraEnabled
    public String message;
}