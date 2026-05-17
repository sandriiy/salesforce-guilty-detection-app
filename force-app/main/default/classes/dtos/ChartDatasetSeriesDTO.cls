public class ChartDatasetSeriesDTO {
    @AuraEnabled
    public String label;
    @AuraEnabled
    public List<Decimal> values;

    public ChartDatasetSeriesDTO(String label, List<Decimal> values) {
        this.label = label;
        this.values = values;
    }
}