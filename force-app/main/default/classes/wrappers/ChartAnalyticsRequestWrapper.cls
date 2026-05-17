public class ChartAnalyticsRequestWrapper {
    public String baseObjectApiName;
    public String selectedRelationshipPath;
    public String groupByFieldApiName;
    public String aggregationType;
    public String aggregationFieldApiName;
    public String chartType;
    public Integer resultLimit;
    public List<ReviewFilterCriteriaWrapper.FilterField> filterConditions;
    public String filterLogic;
    public List<ReviewFilterCriteriaWrapper.FilterField> baseFilterConditions;
    public String baseFilterLogic;
}