public inherited sharing class GuiltyChartQueryBuilder {
    private static final Integer DEFAULT_RESULT_LIMIT = 12;
    private static final Integer MAX_RESULT_LIMIT = 25;
    private static final Integer BASE_RECORD_SELECTION_LIMIT = 2000;

    private GuiltyChartMetadataService metadataService;

    public GuiltyChartQueryBuilder() {
        this.metadataService = new GuiltyChartMetadataService();
    }

    public List<AggregateResult> runAggregateQuery(
        ChartAnalyticsRequestWrapper request,
        ChartRelationshipPathDTO relationshipPath,
        List<String> warnings
    ) {
        String sourceObjectApiName = relationshipPath.sourceObjectApiName;
        Schema.DescribeFieldResult groupByFieldDescribe = metadataService.requireAccessibleField(
            sourceObjectApiName,
            request.groupByFieldApiName
        );
        if (!groupByFieldDescribe.isGroupable()) {
            throw new IllegalArgumentException('Field "' + request.groupByFieldApiName + '" cannot be grouped on.');
        }

        String normalizedAggregationType = normalizeAggregationType(request.aggregationType);
        String aggregateExpression = resolveAggregateExpression(
            sourceObjectApiName,
            normalizedAggregationType,
            request.aggregationFieldApiName
        );
        String relationshipClause = buildRelationshipClause(request, relationshipPath, warnings);
        if (relationshipClause == null) {
            return new List<AggregateResult>();
        }

        String filterClause = buildFilterClause(
            sourceObjectApiName,
            request.filterConditions,
            request.filterLogic
        );
        String baseFilterClause = buildBaseFilterClause(request, relationshipPath, warnings);

        List<String> whereClauses = new List<String>{ relationshipClause };
        if (!String.isBlank(baseFilterClause)) {
            whereClauses.add('(' + baseFilterClause + ')');
        }
        if (!String.isBlank(filterClause)) {
            whereClauses.add('(' + filterClause + ')');
        }

        Integer resultLimit = resolveResultLimit(request.resultLimit);
        String soql = 'SELECT ' + request.groupByFieldApiName + ' groupValue, '
            + aggregateExpression + ' metricValue '
            + 'FROM ' + sourceObjectApiName + ' '
            + 'WHERE ' + String.join(whereClauses, ' AND ') + ' '
            + 'GROUP BY ' + request.groupByFieldApiName + ' '
            + 'ORDER BY ' + aggregateExpression + ' DESC '
            + 'LIMIT ' + String.valueOf(resultLimit);

        return (List<AggregateResult>) Database.query(soql);
    }

    private String buildBaseFilterClause(
        ChartAnalyticsRequestWrapper request,
        ChartRelationshipPathDTO relationshipPath,
        List<String> warnings
    ) {
        if (relationshipPath.relationshipType != 'SELF') {
            return null;
        }

        return buildFilterClause(
            request.baseObjectApiName,
            request.baseFilterConditions,
            request.baseFilterLogic
        );
    }

    private String buildRelationshipClause(
        ChartAnalyticsRequestWrapper request,
        ChartRelationshipPathDTO relationshipPath,
        List<String> warnings
    ) {
        if (relationshipPath.relationshipType == 'SELF') {
            return 'Id != null';
        }

        if (relationshipPath.relationshipType == 'STANDARD_CHILD') {
            Set<Id> baseRecordIds = resolveBaseRecordIds(request, warnings);
            if (baseRecordIds != null) {
                if (baseRecordIds.isEmpty()) {
                    return null;
                }

                return relationshipPath.sourceFieldApiName + ' IN ' + renderStringSet(toStringSet(baseRecordIds));
            }

            return relationshipPath.sourceFieldApiName + ' != null';
        }

        if (relationshipPath.relationshipType == 'ID_REFERENCE') {
            List<String> conditions = new List<String>();
            if (!String.isBlank(relationshipPath.typeDiscriminatorFieldApiName)) {
                conditions.add(
                    relationshipPath.typeDiscriminatorFieldApiName
                    + ' = '
                    + quoteValue(request.baseObjectApiName)
                );
            }

            Set<Id> baseRecordIds = resolveBaseRecordIds(request, warnings);
            if (baseRecordIds != null) {
                if (baseRecordIds.isEmpty()) {
                    return null;
                }

                conditions.add(relationshipPath.sourceFieldApiName + ' IN ' + renderStringSet(toStringSet(baseRecordIds)));
            } else {
                conditions.add(relationshipPath.sourceFieldApiName + ' != null');
            }

            return '(' + String.join(conditions, ' AND ') + ')';
        }

        throw new IllegalArgumentException('Unsupported relationship path: ' + relationshipPath.relationshipType);
    }

    private Set<Id> resolveBaseRecordIds(ChartAnalyticsRequestWrapper request, List<String> warnings) {
        if (request.baseFilterConditions == null || request.baseFilterConditions.isEmpty()) {
            return null;
        }

        metadataService.validateFilterFields(request.baseObjectApiName, request.baseFilterConditions);
        String filterLogic = normalizeFilterLogic(request.baseFilterConditions, request.baseFilterLogic);

        SObjectFilterQueryBuilder.Result queryResult = new SObjectFilterQueryBuilder(request.baseObjectApiName)
            .withFilters(request.baseFilterConditions)
            .withLogic(filterLogic)
            .withFields(new Set<String>{ 'Id' })
            .withLimit(BASE_RECORD_SELECTION_LIMIT + 1)
            .isApexCursor(false)
            .run();

        if (!queryResult.success) {
            throw new IllegalArgumentException(queryResult.errorMessage);
        }

        List<SObject> baseRecords = Database.query(queryResult.soql);
        Set<Id> baseRecordIds = new Set<Id>();
        Integer recordCount = 0;
        for (SObject baseRecord : baseRecords) {
            if (recordCount == BASE_RECORD_SELECTION_LIMIT) {
                warnings.add('Base record matching was limited to ' + BASE_RECORD_SELECTION_LIMIT + ' records. Narrow the base filters to refine the dataset.');
                break;
            }

            baseRecordIds.add((Id) baseRecord.get('Id'));
            recordCount++;
        }

        return baseRecordIds;
    }

    private String buildFilterClause(
        String sObjectApiName,
        List<ReviewFilterCriteriaWrapper.FilterField> filterConditions,
        String filterLogic
    ) {
        if (filterConditions == null || filterConditions.isEmpty()) {
            return null;
        }

        metadataService.validateFilterFields(sObjectApiName, filterConditions);
        String resolvedFilterLogic = normalizeFilterLogic(filterConditions, filterLogic);

        SObjectFilterQueryBuilder.Result queryResult = new SObjectFilterQueryBuilder(sObjectApiName)
            .withFilters(filterConditions)
            .withLogic(resolvedFilterLogic)
            .withFields(new Set<String>{ 'Id' })
            .isApexCursor(false)
            .run();

        if (!queryResult.success) {
            throw new IllegalArgumentException(queryResult.errorMessage);
        }

        String marker = ' WHERE ';
        Integer markerIndex = queryResult.soql.indexOf(marker);
        return markerIndex == -1 ? null : queryResult.soql.substring(markerIndex + marker.length());
    }

    private String normalizeFilterLogic(
        List<ReviewFilterCriteriaWrapper.FilterField> filterConditions,
        String filterLogic
    ) {
        if (!String.isBlank(filterLogic)) {
            return filterLogic;
        }

        List<String> indexes = new List<String>();
        for (Integer index = 0; index < filterConditions.size(); index++) {
            indexes.add(String.valueOf(index));
        }

        return String.join(indexes, ' AND ');
    }

    private String resolveAggregateExpression(
        String sourceObjectApiName,
        String aggregationType,
        String aggregationFieldApiName
    ) {
        if (aggregationType == 'COUNT') {
            return 'COUNT(Id)';
        }

        if (String.isBlank(aggregationFieldApiName)) {
            throw new IllegalArgumentException('Select a numeric field for ' + aggregationType + ' aggregation.');
        }

        if (!metadataService.isNumericField(sourceObjectApiName, aggregationFieldApiName)) {
            throw new IllegalArgumentException('Field "' + aggregationFieldApiName + '" must be numeric for ' + aggregationType + ' aggregation.');
        }

        return aggregationType + '(' + aggregationFieldApiName + ')';
    }

    private Integer resolveResultLimit(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit <= 0) {
            return DEFAULT_RESULT_LIMIT;
        }

        return Math.min(requestedLimit, MAX_RESULT_LIMIT);
    }

    private String normalizeAggregationType(String aggregationType) {
        String normalizedAggregationType = String.isBlank(aggregationType)
            ? 'COUNT'
            : aggregationType.trim().toUpperCase();

        if (normalizedAggregationType != 'COUNT'
            && normalizedAggregationType != 'SUM'
            && normalizedAggregationType != 'AVG') {
            throw new IllegalArgumentException('Unsupported aggregation type: ' + aggregationType);
        }

        return normalizedAggregationType;
    }

    private Set<String> toStringSet(Set<Id> recordIds) {
        Set<String> values = new Set<String>();
        for (Id recordId : recordIds) {
            values.add((String) recordId);
        }

        return values;
    }

    private String quoteValue(String value) {
        return '\'' + String.escapeSingleQuotes(value) + '\'';
    }

    private String renderStringSet(Set<String> values) {
        List<String> quotedValues = new List<String>();
        for (String value : values) {
            quotedValues.add(quoteValue(value));
        }

        quotedValues.sort();
        return '(' + String.join(quotedValues, ',') + ')';
    }
}