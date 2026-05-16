public with sharing class GuiltyChartQueryBuilder {
    private static final Integer DEFAULT_RECORD_LIMIT = 200;
    private static final Integer MAX_RECORD_LIMIT = 2000;

    private final ChartAnalyticsRequestWrapper chartRequest;

    public GuiltyChartQueryBuilder(ChartAnalyticsRequestWrapper chartRequest) {
        this.chartRequest = chartRequest;
    }

    public Result execute() {
        Schema.SObjectType sourceType = Schema.getGlobalDescribe().get(chartRequest.sourceObjectApiName);
        if (sourceType == null) {
            return buildFailure('Source object "' + chartRequest.sourceObjectApiName + '" does not exist or is not accessible.');
        }

        Schema.DescribeSObjectResult sourceDescribe = sourceType.getDescribe();
        if (!sourceDescribe.isAccessible() || !sourceDescribe.isQueryable()) {
            return buildFailure('Source object "' + chartRequest.sourceObjectApiName + '" is not accessible or not queryable.');
        }

        Map<String, Schema.SObjectField> fieldMap = sourceDescribe.fields.getMap();

        String groupByFieldLower = String.isBlank(chartRequest.groupByFieldApiName)
            ? null
            : chartRequest.groupByFieldApiName.toLowerCase();

        if (groupByFieldLower == null || !fieldMap.containsKey(groupByFieldLower)) {
            return buildFailure('Group-by field "' + chartRequest.groupByFieldApiName + '" does not exist on ' + chartRequest.sourceObjectApiName + '.');
        }

        Schema.DescribeFieldResult groupByFieldDescribe = fieldMap.get(groupByFieldLower).getDescribe();
        if (!groupByFieldDescribe.isAccessible()) {
            return buildFailure('Group-by field "' + chartRequest.groupByFieldApiName + '" is not accessible.');
        }

        String validatedGroupByField = groupByFieldDescribe.getName();
        String groupByFieldLabel = groupByFieldDescribe.getLabel();

        String aggregationType = String.isBlank(chartRequest.aggregationType) ? 'COUNT' : chartRequest.aggregationType.toUpperCase();
        String validatedAggField = null;

        if (aggregationType == 'SUM' || aggregationType == 'AVG') {
            if (String.isBlank(chartRequest.aggregationFieldApiName)) {
                return buildFailure('Aggregation field is required for ' + aggregationType + '.');
            }
            String aggFieldLower = chartRequest.aggregationFieldApiName.toLowerCase();
            if (!fieldMap.containsKey(aggFieldLower)) {
                return buildFailure('Aggregation field "' + chartRequest.aggregationFieldApiName + '" does not exist on ' + chartRequest.sourceObjectApiName + '.');
            }
            Schema.DescribeFieldResult aggFieldDescribe = fieldMap.get(aggFieldLower).getDescribe();
            if (!aggFieldDescribe.isAccessible()) {
                return buildFailure('Aggregation field "' + chartRequest.aggregationFieldApiName + '" is not accessible.');
            }
            validatedAggField = aggFieldDescribe.getName();
        }

        String aggregateExpr;
        if (aggregationType == 'SUM') {
            aggregateExpr = 'SUM(' + validatedAggField + ')';
        } else if (aggregationType == 'AVG') {
            aggregateExpr = 'AVG(' + validatedAggField + ')';
        } else {
            aggregateExpr = 'COUNT(Id)';
        }
        String selectClause = validatedGroupByField + ' groupByValue, ' + aggregateExpr + ' aggregateValue';

        List<String> whereClauses = new List<String>();

        Boolean isIdBasedPath = chartRequest.relationshipPathKey != null
            && chartRequest.relationshipPathKey.contains('.__id__.');

        String idPrefixFilter = null;
        if (isIdBasedPath && String.isNotBlank(chartRequest.baseObjectApiName)) {
            Schema.SObjectType baseType = Schema.getGlobalDescribe().get(chartRequest.baseObjectApiName);
            if (baseType != null) {
                String baseKeyPrefix = baseType.getDescribe().getKeyPrefix();
                if (String.isNotBlank(baseKeyPrefix)) {
                    String[] pathParts = chartRequest.relationshipPathKey.split('\\.__id__\\.');
                    if (pathParts.size() == 2) {
                        String joinFieldFromPath = pathParts[1];
                        if (String.isNotBlank(joinFieldFromPath) && fieldMap.containsKey(joinFieldFromPath.toLowerCase())) {
                            Schema.DescribeFieldResult joinFieldDescribe = fieldMap.get(joinFieldFromPath.toLowerCase()).getDescribe();
                            if (joinFieldDescribe.isAccessible()) {
                                idPrefixFilter = baseKeyPrefix + '%';
                                whereClauses.add(joinFieldDescribe.getName() + ' LIKE :idPrefixFilter');
                            }
                        }
                    }
                }
            }
        }

        Date parsedDateRangeStart = null;
        Date parsedDateRangeEnd = null;

        if (String.isNotBlank(chartRequest.dateRangeFieldApiName)) {
            String dateFieldLower = chartRequest.dateRangeFieldApiName.toLowerCase();
            if (fieldMap.containsKey(dateFieldLower)) {
                Schema.DescribeFieldResult dateFieldDescribe = fieldMap.get(dateFieldLower).getDescribe();
                if (dateFieldDescribe.isAccessible()) {
                    String validatedDateField = dateFieldDescribe.getName();
                    if (String.isNotBlank(chartRequest.dateRangeStart)) {
                        try {
                            parsedDateRangeStart = Date.valueOf(chartRequest.dateRangeStart);
                            whereClauses.add(validatedDateField + ' >= :parsedDateRangeStart');
                        } catch (Exception ignored) {}
                    }
                    if (String.isNotBlank(chartRequest.dateRangeEnd)) {
                        try {
                            parsedDateRangeEnd = Date.valueOf(chartRequest.dateRangeEnd);
                            whereClauses.add(validatedDateField + ' <= :parsedDateRangeEnd');
                        } catch (Exception ignored) {}
                    }
                }
            }
        }

        if (chartRequest.filterConditions != null) {
            for (ChartAnalyticsRequestWrapper.ChartFilterCondition condition : chartRequest.filterConditions) {
                if (condition == null || String.isBlank(condition.fieldApiName) || String.isBlank(condition.value)) continue;
                String condFieldLower = condition.fieldApiName.toLowerCase();
                if (!fieldMap.containsKey(condFieldLower)) continue;
                Schema.DescribeFieldResult condFieldDescribe = fieldMap.get(condFieldLower).getDescribe();
                if (!condFieldDescribe.isAccessible()) continue;
                whereClauses.add(condFieldDescribe.getName() + ' = \'' + String.escapeSingleQuotes(condition.value) + '\'');
            }
        }

        Integer limitSize = (chartRequest.recordLimit != null && chartRequest.recordLimit > 0)
            ? Math.min(chartRequest.recordLimit, MAX_RECORD_LIMIT)
            : DEFAULT_RECORD_LIMIT;

        String soql = 'SELECT ' + selectClause
            + ' FROM ' + chartRequest.sourceObjectApiName;

        if (!whereClauses.isEmpty()) {
            soql += ' WHERE ' + String.join(whereClauses, ' AND ');
        }

        soql += ' GROUP BY ' + validatedGroupByField;
        soql += ' ORDER BY ' + aggregateExpr + ' DESC NULLS LAST';
        soql += ' LIMIT ' + String.valueOf(limitSize);

        try {
            List<AggregateResult> queryResults = (List<AggregateResult>) Database.query(soql);
            return buildSuccess(queryResults, groupByFieldLabel);
        } catch (Exception ex) {
            return buildFailure('Query failed: ' + ex.getMessage());
        }
    }

    public class Result {
        public Boolean isSuccess;
        public String errorMessage;
        public List<AggregateResult> aggregateResults;
        public String groupByFieldLabel;
    }

    private Result buildSuccess(List<AggregateResult> rows, String label) {
        Result r = new Result();
        r.isSuccess = true;
        r.aggregateResults = rows;
        r.groupByFieldLabel = label;
        return r;
    }

    private Result buildFailure(String msg) {
        Result r = new Result();
        r.isSuccess = false;
        r.errorMessage = msg;
        r.aggregateResults = new List<AggregateResult>();
        return r;
    }
}

