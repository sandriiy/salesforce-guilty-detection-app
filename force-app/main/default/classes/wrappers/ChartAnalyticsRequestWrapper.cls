public class ChartAnalyticsRequestWrapper {
    public String baseObjectApiName;
    public String sourceObjectApiName;
    public String relationshipPathKey;
    public String groupByFieldApiName;
    public String aggregationType;
    public String aggregationFieldApiName;
    public String chartType;
    public Integer recordLimit;
    public String dateRangeFieldApiName;
    public String dateRangeStart;
    public String dateRangeEnd;
    public List<ChartFilterCondition> filterConditions;

    public class ChartFilterCondition {
        public String fieldApiName;
        public String operator;
        public String value;
    }
}
