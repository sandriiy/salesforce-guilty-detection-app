public with sharing class GuiltyChartQueryBuilder {
    public static String buildAggregateQuery(GuiltyChartDTOs.DatasetRequest request) {
        String groupBy = String.escapeSingleQuotes(request.groupByFieldApiName);
        String sourceObj = String.escapeSingleQuotes(request.sourceObjectApiName);
        return 'SELECT ' + groupBy + ' label, COUNT(Id) val FROM ' + sourceObj + ' WITH USER_MODE GROUP BY ' + groupBy;
    }
}