public class ChartDatasetResponseDTO {
    @AuraEnabled public List<String> labels;
    @AuraEnabled public List<ChartDatasetEntryDTO> datasets;
    @AuraEnabled public String chartType;
    @AuraEnabled public String groupByFieldLabel;
    @AuraEnabled public String groupByFieldApiName;
    @AuraEnabled public String sourceObjectApiName;
    @AuraEnabled public String relationshipPathKey;
    @AuraEnabled public Boolean isIdBasedReference;
    @AuraEnabled public List<String> warnings;

    public class ChartDatasetEntryDTO {
        @AuraEnabled public String label;
        @AuraEnabled public List<Decimal> data;
        @AuraEnabled public List<String> backgroundColor;
    }
}
